import { collection, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const OFFICES = [
  "Administrative and Finance Division", "Agribusiness and Marketing Assistance Division", "Field Operations Division", "Finance Division", "Integrated Laboratories Division", "Planning, Monitoring and Evaluation Division", "Regional Agricultural Engineering Division", "Regional Executive Director", "Regulatory Division", "Research Division", "RTD for Operations", "RTD for Research and Regulations",
] as const;

export interface TravelOrder {
  id: string;
  type: "individual" | "group";
  office: string;
  travelNo: string;
  personnel: string;
  destination: string;
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
  dateFrom: string;
  dateTo: string;
}

export function orderFromDocument(id: string, value: Record<string, unknown>): TravelOrder {
  return { id, type: value.type === "group" ? "group" : "individual", office: String(value.office ?? ""), travelNo: String(value.travelNo ?? ""), personnel: String(value.personnel ?? ""), destination: String(value.destination ?? ""), dateFrom: String(value.dateFrom ?? ""), dateTo: String(value.dateTo ?? "") };
}

function currentTravelPeriod() {
  const parts = new Intl.DateTimeFormat("en-US", { month: "2-digit", year: "2-digit", timeZone: "Asia/Manila" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "month")?.value ?? "01"}${parts.find((part) => part.type === "year")?.value ?? "00"}`;
}

export async function createTravelOrders(draft: TravelOrderDraft) {
  if (!draft.people.length || draft.people.length > 100) throw new Error("A travel order must include between 1 and 100 personnel entries.");
  if (draft.type === "group" && draft.people.length < 2) throw new Error("A group travel order requires at least two personnel entries.");

  const period = currentTravelPeriod();
  const sequenceRef = doc(db, "travelOrderSequences", period);
  const recordRefs = draft.people.map(() => doc(collection(db, "travelOrders")));
  const groupId = draft.type === "group" ? crypto.randomUUID() : null;

  return runTransaction(db, async (transaction) => {
    const sequence = await transaction.get(sequenceRef);
    const savedLast = Number(sequence.data()?.lastSequence ?? 0);
    const novemberBaseline = period === "1126" ? 713 : 0;
    const previousLast = Math.max(savedLast, novemberBaseline);
    const travelNumbers = draft.people.map((_, index) => `${period}-${String(previousLast + index + 1).padStart(4, "0")}`);

    transaction.set(sequenceRef, { lastSequence: previousLast + draft.people.length, updatedAt: serverTimestamp() });
    draft.people.forEach((person, index) => {
      transaction.set(recordRefs[index], {
        type: draft.type,
        office: person.office,
        personnel: person.personnel.trim(),
        destination: draft.destination.trim(),
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