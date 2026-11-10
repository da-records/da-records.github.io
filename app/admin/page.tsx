"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { ArrowLeft, ArrowRight, Check, CircleAlert, LoaderCircle, LogOut, Pencil, Plus, ShieldCheck, X } from "lucide-react";
import LoadingProgress from "@/components/LoadingProgress";
import { useAccessCodeLogout } from "@/components/AccessCodeGate";
import { auth, db, initializeAnalytics } from "@/lib/firebase";
import { createTravelOrders, formatDate, OFFICES, orderFromDocument, type TravelOrder, type TravelOrderDraft } from "@/lib/records";

const SUFFIXES = ["Jr.", "Sr.", "II", "III", "IV", "V", "VI"];
const PAGE_SIZE = 15;
type Signup = { firstName: string; middleName: string; lastName: string; suffix: string; sexAtBirth: string; contactNo: string; email: string; password: string };
type RecordForm = TravelOrderDraft;
const EMPTY_SIGNUP: Signup = { firstName: "", middleName: "", lastName: "", suffix: "", sexAtBirth: "", contactNo: "", email: "", password: "" };
const EMPTY_RECORD: RecordForm = { type: "individual", people: [{ office: "", personnel: "" }], destination: "", toDate: "", dateFrom: "", dateTo: "" };

function errorMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const message = error instanceof Error ? error.message : "";
  if (/database\s+['"]?\(default\)['"]?\s+does not exist/i.test(message)) {
    return "Firestore is not set up yet. Create the default database in Firebase Console, then publish firestore.rules.";
  }
  if (code.includes("email-already-in-use")) return "An account with this email already exists.";
  if (code.includes("invalid-credential") || code.includes("user-not-found")) return "Email or password is incorrect.";
  if (code.includes("weak-password")) return "Choose a password with at least 6 characters.";
  if (code.includes("network-request-failed")) return "Network error. Check your connection and try again.";
  if (code.includes("permission-denied") || /missing or insufficient permissions/i.test(message)) {
    return "Firebase denied this request. The rules are deployed; sign out and back in with a verified email, then try again.";
  }
  return message || "Something went wrong. Please try again.";
}

export default function AdminPage() {
  const logoutAccess = useAccessCodeLogout();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [signup, setSignup] = useState<Signup>(EMPTY_SIGNUP);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [records, setRecords] = useState<TravelOrder[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState("");
  const [office, setOffice] = useState("all");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TravelOrder | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [editing, setEditing] = useState<TravelOrder | null>(null);
  const [recordForm, setRecordForm] = useState<RecordForm>(EMPTY_RECORD);
  const [recordBusy, setRecordBusy] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [recordMessage, setRecordMessage] = useState("");

  function setTravelType(type: "individual" | "group") {
    setRecordForm((current) => {
      const firstPerson = current.people[0] ?? { office: "", personnel: "" };
      const people = type === "individual"
        ? [firstPerson]
        : current.people.length >= 2
          ? current.people
          : [...current.people, { office: "", personnel: "" }];
      return { ...current, type, people };
    });
  }

  function updatePerson(index: number, field: "office" | "personnel", value: string) {
    setRecordForm((current) => ({
      ...current,
      people: current.people.map((person, personIndex) => personIndex === index ? { ...person, [field]: value } : person),
    }));
  }

  useEffect(() => {
    void initializeAnalytics().catch(() => undefined);
    return onAuthStateChanged(auth, (currentUser) => {
      if (currentUser?.emailVerified) {
        setUser(currentUser);
        setRecordsLoading(true);
      } else {
        setUser(null);
        setRecordsLoading(false);
      }
      setRecordsError("");
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, "travelOrders"), (snapshot) => {
      const loaded = snapshot.docs.map((item) => orderFromDocument(item.id, item.data()));
      loaded.sort((first, second) => second.dateFrom.localeCompare(first.dateFrom) || second.travelNo.localeCompare(first.travelNo));
      setRecords(loaded);
      setRecordsError("");
      setRecordsLoading(false);
    }, () => {
      setRecordsError("Could not load records. Confirm that the Firestore rules are published.");
      setRecordsLoading(false);
    });
  }, [user]);

  const filtered = useMemo(() => office === "all" ? records : records.filter((record) => record.office === office), [office, records]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayPage = Math.min(page, pageCount);
  const visible = filtered.slice((displayPage - 1) * PAGE_SIZE, displayPage * PAGE_SIZE);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!result.user.emailVerified) {
        await sendEmailVerification(result.user);
        await signOut(auth);
        setAuthError("Your email is not verified. A new verification link has been sent.");
      }
    } catch (error) {
      setAuthError(errorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");
    try {
      const result = await createUserWithEmailAndPassword(auth, signup.email.trim(), signup.password);
      const displayName = [signup.firstName, signup.middleName, signup.lastName, signup.suffix].filter(Boolean).join(" ");
      await updateProfile(result.user, { displayName });
      await setDoc(doc(db, "adminProfiles", result.user.uid), {
        firstName: signup.firstName.trim(), middleName: signup.middleName.trim(), lastName: signup.lastName.trim(),
        suffix: signup.suffix, sexAtBirth: signup.sexAtBirth, contactNo: signup.contactNo.trim(), email: signup.email.trim(),
        createdAt: serverTimestamp(),
      });
      await sendEmailVerification(result.user);
      await signOut(auth);
      setMode("login");
      setPassword("");
      setAuthMessage("Account created. Verify your email using the link we sent, then sign in.");
    } catch (error) {
      setAuthError(errorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  function startCreate() {
    setEditing(null);
    setRecordForm(EMPTY_RECORD);
    setRecordError("");
    setDialogOpen(true);
  }

  function startEdit(record: TravelOrder) {
    setEditing(record);
    setRecordForm({ type: record.type, people: [{ office: record.office, personnel: record.personnel }], destination: record.destination, toDate: record.toDate, dateFrom: record.dateFrom, dateTo: record.dateTo });
    setRecordError("");
    setDialogOpen(true);
  }

  async function handleRecordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRecordBusy(true);
    setRecordError("");
    try {
      if (editing) {
        const person = recordForm.people[0];
        await updateDoc(doc(db, "travelOrders", editing.id), { type: editing.type, office: person.office, personnel: person.personnel.trim(), destination: recordForm.destination.trim(), ...(recordForm.toDate ? { toDate: recordForm.toDate } : {}), dateFrom: recordForm.dateFrom, dateTo: recordForm.dateTo, updatedAt: serverTimestamp() });
        setRecordMessage(`${editing.travelNo} updated.`);
      } else {
        const travelNumbers = await createTravelOrders(recordForm);
        setRecordMessage(recordForm.type === "group" ? `${travelNumbers.length} group travel orders added (${travelNumbers[0]}–${travelNumbers.at(-1)}).` : `${travelNumbers[0]} added to the register.`);
      }
      setDialogOpen(false);
    } catch (error) {
      setRecordError(errorMessage(error));
    } finally {
      setRecordBusy(false);
    }
  }

  async function handleDelete(record: TravelOrder) {
    setDeleteTarget(record);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteDoc(doc(db, "travelOrders", deleteTarget.id));
      setRecordMessage(`${deleteTarget.travelNo} deleted.`);
      setRecordsError("");
      setDeleteTarget(null);
    } catch (error) {
      setRecordsError(errorMessage(error));
    } finally {
      setDeleteBusy(false);
    }
  }

  useEffect(() => {
    if (!deleteTarget) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleteBusy) setDeleteTarget(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [deleteTarget, deleteBusy]);

  if (!authReady) return <LoadingProgress loading />;

  if (!user) return (
    <>
      <header className="site-header compact-header"><Link className="brand-link" href="/" aria-label="Public travel order records"><Image className="brand-logo" src="/tor_logo_white.png" alt="Travel Order Records" width={490} height={180} priority draggable={false} /></Link><button className="header-link" type="button" title="Log out of records" aria-label="Log out of records" onClick={logoutAccess}><LogOut size={15} />Log out</button></header>
      <main className="auth-layout">
        <section className="auth-main"><form className="auth-form" onSubmit={mode === "login" ? handleLogin : handleSignup}>
          <p className="eyebrow">Admin access</p><h2>{mode === "login" ? "Sign in" : "Create an account"}</h2><p className="auth-intro">{mode === "login" ? "Use your verified email to manage travel orders." : "Set up your verified account to access record management."}</p>
          {authError && <div className="notice notice-error" role="alert"><CircleAlert size={17} />{authError}</div>}{authMessage && <div className="notice notice-success" role="status"><Check size={17} />{authMessage}</div>}
          {mode === "signup" && <>
            <div className="signup-name-grid">
            <div className="field"><label htmlFor="firstName">First name</label><input id="firstName" className="field-input" autoComplete="given-name" required value={signup.firstName} onChange={(event) => setSignup({ ...signup, firstName: event.target.value })} /></div>
            <div className="field"><label htmlFor="middleName">Middle name</label><input id="middleName" className="field-input" autoComplete="additional-name" value={signup.middleName} onChange={(event) => setSignup({ ...signup, middleName: event.target.value })} /></div>
            <div className="field"><label htmlFor="lastName">Last name</label><input id="lastName" className="field-input" autoComplete="family-name" required value={signup.lastName} onChange={(event) => setSignup({ ...signup, lastName: event.target.value })} /></div>
            <div className="field"><label htmlFor="suffix">Suffix</label><select id="suffix" className="field-select" value={signup.suffix} onChange={(event) => setSignup({ ...signup, suffix: event.target.value })}><option value="">None</option>{SUFFIXES.map((item) => <option key={item}>{item}</option>)}</select></div>
            </div>
            <div className="form-grid signup-personal-grid">
            <div className="field"><label htmlFor="sexAtBirth">Sex at birth</label><select id="sexAtBirth" className="field-select" required value={signup.sexAtBirth} onChange={(event) => setSignup({ ...signup, sexAtBirth: event.target.value })}><option value="">Select</option><option>Male</option><option>Female</option></select></div>
            <div className="field"><label htmlFor="contactNo">Contact no.</label><input id="contactNo" className="field-input" type="tel" autoComplete="tel" required value={signup.contactNo} onChange={(event) => setSignup({ ...signup, contactNo: event.target.value })} /></div>
            </div>
          </>}
          <div className="form-grid" style={{ marginTop: mode === "signup" ? 13 : 0 }}>
            <div className="field full"><label htmlFor="email">Email</label><input id="email" className="field-input" type="email" autoComplete="email" required value={mode === "login" ? email : signup.email} onChange={(event) => mode === "login" ? setEmail(event.target.value) : setSignup({ ...signup, email: event.target.value })} /></div>
            <div className="field full"><label htmlFor="password">Password</label><input id="password" className="field-input" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required value={mode === "login" ? password : signup.password} onChange={(event) => mode === "login" ? setPassword(event.target.value) : setSignup({ ...signup, password: event.target.value })} /></div>
          </div>
          <button className="button-primary auth-submit" type="submit" disabled={authBusy}>{authBusy ? <LoaderCircle className="spinner" size={17} /> : <ShieldCheck size={17} />}{authBusy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}</button>
          <p className="auth-switch">{mode === "login" ? "New to the records portal?" : "Already have an account?"}<button className="text-button" type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setAuthError(""); setAuthMessage(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
          <div className="auth-footer"><Link className="text-button" href="/">View public records</Link></div>
        </form></section>
      </main>
    </>
  );

  return (
    <>
      <header className="site-header compact-header"><Link className="brand-link" href="/" aria-label="Public register"><Image className="brand-logo" src="/tor_logo_white.png" alt="Travel Order Records" width={490} height={180} priority draggable={false} /></Link><div className="admin-top-actions"><span className="header-note">{user.displayName || user.email}</span><button className="header-link" type="button" onClick={() => { void signOut(auth).catch(() => undefined).finally(logoutAccess); }}><LogOut size={15} />Sign out</button></div></header>
      <main className="page-shell">
        <section className="page-intro"><div><p className="eyebrow">Admin workspace</p><h1 className="page-title">Travel order records</h1><p className="page-subtitle">Create, update, and maintain the published register.</p></div><div className="intro-meta"><span className="status-dot" />Verified account</div></section>
        <div className="admin-toolbar"><span className="intro-meta">Changes publish to the public register</span><button className="button-primary" type="button" onClick={startCreate}><Plus size={17} />New travel order</button></div>
        {recordMessage && <div className="notice notice-success" role="status"><Check size={17} />{recordMessage}<button className="text-button" type="button" aria-label="Dismiss message" onClick={() => setRecordMessage("")}><X size={15} /></button></div>}{recordsError && <div className="notice notice-error" role="alert"><CircleAlert size={17} />{recordsError}</div>}
        <section className="records-panel" aria-label="Manage travel order records">
          <div className="panel-topline"><div><h2 className="panel-heading">Travel order register</h2><p className="panel-count">{filtered.length} {filtered.length === 1 ? "record" : "records"}</p></div><label className="filter-control"><span>Filter by office</span><span className="select-wrap"><select value={office} onChange={(event) => { setOffice(event.target.value); setPage(1); }} aria-label="Filter by office"><option value="all">All offices</option>{OFFICES.map((item) => <option key={item}>{item}</option>)}</select></span></label></div>
          <div className="table-scroll"><table className="records-table"><thead><tr><th rowSpan={2}>Office</th><th rowSpan={2}>Travel No.</th><th rowSpan={2}>Type</th><th rowSpan={2}>TO Date</th><th rowSpan={2}>Personnel</th><th rowSpan={2}>Destination</th><th colSpan={2}>Travel Dates</th><th rowSpan={2} className="action-cell">Actions</th></tr><tr><th>Date From</th><th>Date To</th></tr></thead><tbody>
            {recordsLoading ? <tr><td className="table-state" colSpan={9}>Loading travel orders...</td></tr> : visible.length ? visible.map((record) => <tr key={record.id}><td className="office-cell">{record.office}</td><td className="travel-number">{record.travelNo}</td><td>{record.type === "group" ? "Group" : "Individual"}</td><td className="date-cell">{formatDate(record.toDate)}</td><td className="personnel-cell">{record.personnel}</td><td className="destination-cell">{record.destination}</td><td className="date-cell">{formatDate(record.dateFrom)}</td><td className="date-cell">{formatDate(record.dateTo)}</td><td className="action-cell"><button className="icon-button" type="button" title="Edit record" aria-label={`Edit ${record.travelNo}`} onClick={() => startEdit(record)}><Pencil size={15} /></button><button className="icon-button danger" type="button" title="Delete record" aria-label={`Delete ${record.travelNo}`} onClick={() => void handleDelete(record)}><X size={15} /></button></td></tr>) : <tr><td className="table-state" colSpan={9}><strong>{records.length ? "No records for this office" : "No travel orders published yet"}</strong></td></tr>}
          </tbody></table></div>
          <div className="table-footer"><span>{filtered.length ? `Showing ${(displayPage - 1) * PAGE_SIZE + 1}-${Math.min(displayPage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : "Showing 0 records"}</span><nav className="pagination" aria-label="Records pages"><button type="button" title="Previous page" aria-label="Previous page" disabled={displayPage <= 1} onClick={() => setPage(displayPage - 1)}><ArrowLeft size={16} /></button><span className="page-number">{displayPage} / {pageCount}</span><button type="button" title="Next page" aria-label="Next page" disabled={displayPage >= pageCount} onClick={() => setPage(displayPage + 1)}><ArrowRight size={16} /></button></nav></div>
        </section>
        <footer className="site-footer"><span><strong>DA Records</strong> · Signed in as {user.email}</span><Link href="/">Open public register</Link></footer>
      </main>
      {dialogOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !recordBusy) setDialogOpen(false); }}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="record-dialog-title"><div className="modal-head"><h2 id="record-dialog-title">{editing ? `Edit ${editing.travelNo}` : "New travel order"}</h2><button className="icon-button" type="button" aria-label="Close dialog" disabled={recordBusy} onClick={() => setDialogOpen(false)}><X size={17} /></button></div><form className="modal-body" onSubmit={handleRecordSubmit}>
        {recordError && <div className="notice notice-error" role="alert">{recordError}</div>}
        <div className="form-grid type-date-row"><fieldset className="type-field"><legend>Type</legend><div className="record-type-options" role="group" aria-label="Travel order type">
          <label className={`record-type-option${recordForm.type === "individual" ? " is-selected" : ""}`}><input type="checkbox" checked={recordForm.type === "individual"} disabled={Boolean(editing)} onChange={(event) => { if (event.target.checked) setTravelType("individual"); }} /><span>Individual</span></label>
          <label className={`record-type-option${recordForm.type === "group" ? " is-selected" : ""}`}><input type="checkbox" checked={recordForm.type === "group"} disabled={Boolean(editing)} onChange={(event) => { if (event.target.checked) setTravelType("group"); }} /><span>Group</span></label>
        </div></fieldset><div className="field"><label htmlFor="toDate">TO Date</label><input id="toDate" className="field-input" type="date" required={!editing || Boolean(editing.toDate)} value={recordForm.toDate} onChange={(event) => setRecordForm({ ...recordForm, toDate: event.target.value })} /></div></div>
        {recordForm.type === "individual" && <div className="form-grid person-fields">
          <div className="field"><label htmlFor="person-office">Office</label><select id="person-office" className="field-select" required value={recordForm.people[0]?.office ?? ""} onChange={(event) => updatePerson(0, "office", event.target.value)}><option value="">Select office</option>{OFFICES.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="field"><label htmlFor="person-name">Personnel</label><input id="person-name" className="field-input" required maxLength={140} value={recordForm.people[0]?.personnel ?? ""} onChange={(event) => updatePerson(0, "personnel", event.target.value)} /></div>
        </div>}
        {recordForm.type === "group" && <div className="group-trip-fields"><div className="field full"><label htmlFor="destination">Destination</label><input id="destination" className="field-input" required maxLength={180} value={recordForm.destination} onChange={(event) => setRecordForm({ ...recordForm, destination: event.target.value })} /></div>
          <div className="form-grid shared-trip-fields"><div className="field"><label htmlFor="dateFrom">Date from</label><input id="dateFrom" className="field-input" type="date" required value={recordForm.dateFrom} onChange={(event) => setRecordForm({ ...recordForm, dateFrom: event.target.value })} /></div><div className="field"><label htmlFor="dateTo">Date to</label><input id="dateTo" className="field-input" type="date" min={recordForm.dateFrom} required value={recordForm.dateTo} onChange={(event) => setRecordForm({ ...recordForm, dateTo: event.target.value })} /></div></div>
        </div>}
        {recordForm.type === "individual" && <div className="form-grid shared-trip-fields"><div className="field full"><label htmlFor="destination">Destination</label><input id="destination" className="field-input" required maxLength={180} value={recordForm.destination} onChange={(event) => setRecordForm({ ...recordForm, destination: event.target.value })} /></div><div className="field"><label htmlFor="dateFrom">Date from</label><input id="dateFrom" className="field-input" type="date" required value={recordForm.dateFrom} onChange={(event) => setRecordForm({ ...recordForm, dateFrom: event.target.value })} /></div><div className="field"><label htmlFor="dateTo">Date to</label><input id="dateTo" className="field-input" type="date" min={recordForm.dateFrom} required value={recordForm.dateTo} onChange={(event) => setRecordForm({ ...recordForm, dateTo: event.target.value })} /></div></div>}
        {recordForm.type === "group" && <div className="group-people-section">
          <div className="group-people-heading"><div><strong>Personnel and office</strong><span>{editing ? "Editing this member's record" : `${recordForm.people.length} entries · each receives its own travel number`}</span></div>{!editing && <button className="button-quiet add-person-button" type="button" disabled={recordForm.people.length >= 100} onClick={() => setRecordForm({ ...recordForm, people: [...recordForm.people, { office: "", personnel: "" }] })}><Plus size={15} />Add person</button>}</div>
          <div className="group-people-list">{recordForm.people.map((person, index) => <div className="group-person-row" key={index}><span className="person-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="field"><label htmlFor={`group-person-${index}`}>Personnel</label><input id={`group-person-${index}`} className="field-input" required maxLength={140} value={person.personnel} onChange={(event) => updatePerson(index, "personnel", event.target.value)} /></div>
            <div className="field"><label htmlFor={`group-office-${index}`}>Office</label><select id={`group-office-${index}`} className="field-select" required value={person.office} onChange={(event) => updatePerson(index, "office", event.target.value)}><option value="">Select office</option>{OFFICES.map((item) => <option key={item}>{item}</option>)}</select></div>
            {!editing && <button className="icon-button danger remove-person-button" type="button" disabled={recordForm.people.length <= 2} title="Remove person" aria-label={`Remove person ${index + 1}`} onClick={() => setRecordForm({ ...recordForm, people: recordForm.people.filter((_, personIndex) => personIndex !== index) })}><X size={15} /></button>}
          </div>)}</div>
          {editing && <p className="form-hint">Changes apply to this personnel record only.</p>}
        </div>}
        {!editing && <p className="form-hint">Travel number is assigned automatically when this record is saved.</p>}
        <div className="modal-actions"><button className="button-quiet" type="button" disabled={recordBusy} onClick={() => setDialogOpen(false)}>Cancel</button><button className="button-primary" type="submit" disabled={recordBusy}>{recordBusy ? <LoaderCircle className="spinner" size={16} /> : <Check size={16} />}{recordBusy ? "Saving..." : editing ? "Save changes" : "Add record"}</button></div>
      </form></section></div>}
      {deleteTarget && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleteBusy) setDeleteTarget(null); }}><section className="modal delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description"><div className="modal-head"><span className="delete-mark"><X size={18} /></span><button className="icon-button" type="button" aria-label="Close dialog" disabled={deleteBusy} onClick={() => setDeleteTarget(null)}><X size={17} /></button></div><div className="delete-modal-content"><p className="eyebrow">Delete travel order</p><h2 id="delete-dialog-title">Remove {deleteTarget.travelNo}?</h2><p id="delete-dialog-description">This record will be removed from the public register. This action cannot be undone.</p><div className="modal-actions"><button className="button-quiet" type="button" autoFocus disabled={deleteBusy} onClick={() => setDeleteTarget(null)}>Cancel</button><button className="button-danger" type="button" disabled={deleteBusy} onClick={() => void confirmDelete()}>{deleteBusy ? <LoaderCircle className="spinner" size={16} /> : <X size={16} />}{deleteBusy ? "Deleting..." : "Delete record"}</button></div></div></section></div>}
    </>
  );
}
