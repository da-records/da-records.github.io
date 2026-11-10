import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DIVISIONS = [
  "Administrative and Finance Division", "Agribusiness and Marketing Assistance Division", "Field Operations Division", "Finance Division", "Integrated Laboratories Division", "Planning, Monitoring and Evaluation Division", "Regional Agricultural Engineering Division", "Regional Executive Director", "Regulatory Division", "Research Division", "RTD for Operations", "RTD for Research and Regulations",
] as const;

export const SPECIAL_PROJECTS = ["4K's", "AGRISTAT", "AMIA", "AOP", "Corn", "DRRM", "F2C2", "GAD", "MIADP", "NUPAP", "PRDP", "Rice", "RSBSA", "SAAD"] as const;

export const OFFICES = [...DIVISIONS, ...SPECIAL_PROJECTS] as const;

export interface TravelOrder {
  id: string;
  type: "individual" | "group";
  office: string;
  travelNo: string;
  personnel: string;
  destination: string;
  toDate: string;
  dateFrom: string;
  dateTo: string;
}

export interface TravelOrderPerson {
  office: string;
  personnel: string;
}

export interface TravelOrderDraft {
  type: "individual" | "group";
  people: TravelOrderPerson[];
  destination: string;
  toDate: string;
  dateFrom: string;
  dateTo: string;
}

export function orderFromDocument(id: string, value: Record<string, unknown>): TravelOrder {
  return { id, type: value.type === "group" ? "group" : "individual", office: String(value.office ?? ""), travelNo: String(value.travelNo ?? ""), personnel: String(value.personnel ?? ""), destination: String(value.destination ?? ""), toDate: String(value.toDate ?? ""), dateFrom: String(value.dateFrom ?? ""), dateTo: String(value.dateTo ?? "") };
}

export function getAdditionalOffices(records: TravelOrder[]) {
  const listedOffices = new Set<string>(OFFICES);
  return [...new Set(records.map((record) => record.office.trim()).filter((office) => office && !listedOffices.has(office)))].sort((first, second) => first.localeCompare(second, "en", { sensitivity: "base" }));
}

function currentTravelPeriod() {
  const parts = new Intl.DateTimeFormat("en-US", { month: "2-digit", year: "2-digit", timeZone: "Asia/Manila" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "month")?.value ?? "01"}${parts.find((part) => part.type === "year")?.value ?? "00"}`;
}

export async function createTravelOrders(draft: TravelOrderDraft) {
  if (!draft.people.length || draft.people.length > 100) throw new Error("A travel order must include between 1 and 100 personnel entries.");
  if (draft.type === "group" && draft.people.length < 2) throw new Error("A group travel order requires at least two personnel entries.");
  if (draft.people.some((person) => !person.office.trim())) throw new Error("Enter an office or special project for each person.");

  const period = currentTravelPeriod();
  const sequenceRef = doc(db, "travelOrderSequences", period);
  const recordRefs = draft.people.map(() => doc(collection(db, "travelOrders")));
  const groupId = draft.type === "group" ? crypto.randomUUID() : null;
  const monthlyRecordsQuery = query(
    collection(db, "travelOrders"),
    where("travelNo", ">=", `${period}-0001`),
    where("travelNo", "<=", `${period}-9999`),
  );
  const monthlyRecords = await getDocs(monthlyRecordsQuery);
  const usedSequences = new Set<number>();
  for (const record of monthlyRecords.docs) {
    const match = /^(\d{4})-(\d{4})$/.exec(String(record.data().travelNo ?? ""));
    if (match?.[1] === period) usedSequences.add(Number(match[2]));
  }

  return runTransaction(db, async (transaction) => {
    const sequence = await transaction.get(sequenceRef);
    const savedLast = Number(sequence.data()?.lastSequence ?? 0);
    const existingLast = Math.max(0, ...usedSequences);
    let lastSequence = sequence.exists() ? savedLast : existingLast;
    const travelNumbers = draft.people.map(() => {
      let nextSequence = lastSequence + 1;
      while (usedSequences.has(nextSequence)) nextSequence += 1;
      if (nextSequence > 9999) throw new Error(`The travel number sequence for ${period} is full.`);
      usedSequences.add(nextSequence);
      lastSequence = nextSequence;
      return `${period}-${String(nextSequence).padStart(4, "0")}`;
    });

    transaction.set(sequenceRef, { lastSequence, updatedAt: serverTimestamp() });
    draft.people.forEach((person, index) => {
      transaction.set(recordRefs[index], {
        type: draft.type,
        office: person.office.trim(),
        personnel: person.personnel.trim(),
        destination: draft.destination.trim(),
        toDate: draft.toDate,
        dateFrom: draft.dateFrom,
        dateTo: draft.dateTo,
        travelNo: travelNumbers[index],
        ...(groupId ? { groupId, groupSize: draft.people.length } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    return travelNumbers;
  });
}

export function formatDate(value: string) {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-PH", { month: "short", day: "2-digit", year: "numeric" }).format(date);
}

const SHORT_MONTHS = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "Jun.", "Jul.", "Aug.", "Sep.", "Oct.", "Nov.", "Dec."];

function parseISODate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

function formatShortDate(date: { year: number; month: number; day: number }) {
  return `${SHORT_MONTHS[date.month - 1]} ${date.day}, ${date.year}`;
}

export function formatTravelDates(dateFrom: string, dateTo: string) {
  const from = parseISODate(dateFrom);
  const to = parseISODate(dateTo);
  if (!from || !to) {
    if (!dateFrom && !dateTo) return "-";
    if (!dateFrom) return formatDate(dateTo);
    if (!dateTo) return formatDate(dateFrom);
    return `${formatDate(dateFrom)} - ${formatDate(dateTo)}`;
  }

  if (from.year === to.year && from.month === to.month && from.day === to.day) return formatShortDate(from);
  if (from.year === to.year && from.month === to.month) return `${SHORT_MONTHS[from.month - 1]} ${from.day}-${to.day}, ${to.year}`;
  if (from.year === to.year) return `${SHORT_MONTHS[from.month - 1]} ${from.day} - ${SHORT_MONTHS[to.month - 1]} ${to.day}, ${to.year}`;
  return `${formatShortDate(from)} - ${formatShortDate(to)}`;
}

export function matchesTravelOrderSearch(record: TravelOrder, searchTerm: string) {
  const terms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;

  const searchableText = [
    record.travelNo,
    record.personnel,
    record.office,
    record.destination,
    record.toDate,
    formatDate(record.toDate),
    record.dateFrom,
    record.dateTo,
    formatTravelDates(record.dateFrom, record.dateTo),
  ].join(" ").toLowerCase();

  return terms.every((term) => searchableText.includes(term));
}
