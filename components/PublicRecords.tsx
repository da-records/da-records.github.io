"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { ArrowLeft, ArrowRight, LogOut, Search } from "lucide-react";
import { useAccessCodeLogout } from "@/components/AccessCodeGate";
import LoadingProgress from "@/components/LoadingProgress";
import { db, initializeAnalytics } from "@/lib/firebase";
import { DIVISIONS, formatDate, formatTravelDates, getAdditionalOffices, matchesTravelOrderSearch, orderFromDocument, SPECIAL_PROJECTS, type TravelOrder } from "@/lib/records";

const PAGE_SIZE = 10;

export default function PublicRecords() {
  const logoutAccess = useAccessCodeLogout();
  const [records, setRecords] = useState<TravelOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    const initialLoadTimer = window.setTimeout(() => {
      setError("The register is taking longer than expected. Confirm that the Firebase Firestore database has been created.");
      setLoading(false);
    }, 8_000);
    void initializeAnalytics().catch(() => undefined);
    const unsubscribe = onSnapshot(collection(db, "travelOrders"), (snapshot) => {
      window.clearTimeout(initialLoadTimer);
      const loaded = snapshot.docs.map((item) => orderFromDocument(item.id, item.data()));
      loaded.sort((first, second) => second.dateFrom.localeCompare(first.dateFrom) || second.travelNo.localeCompare(first.travelNo));
      setRecords(loaded);
      setError("");
      setLoading(false);
    }, () => {
      window.clearTimeout(initialLoadTimer);
      setError("The public register could not be reached. Please refresh the page shortly.");
      setLoading(false);
    });
    return () => {
      window.clearTimeout(initialLoadTimer);
      unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => records.filter((record) =>
    (office === "all" || record.office === office) && matchesTravelOrderSearch(record, searchTerm),
  ), [office, records, searchTerm]);
  const additionalOffices = useMemo(() => getAdditionalOffices(records), [records]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayPage = Math.min(page, pageCount);
  const visible = filtered.slice((displayPage - 1) * PAGE_SIZE, displayPage * PAGE_SIZE);

  return (
    <>
      <LoadingProgress loading={loading} />
      <header className="site-header compact-header">
        <Link className="brand-link" href="/" aria-label="Travel Order Records home"><Image className="brand-logo" src="/tor_logo_white.png" alt="Travel Order Records" width={490} height={180} priority draggable={false} /></Link>
        <button className="header-link" type="button" title="Log out of records" aria-label="Log out of records" onClick={logoutAccess}><LogOut size={15} />Log out</button>
      </header>
      <main className="page-shell">
        <section className="page-intro"><div><p className="eyebrow">Department of Agriculture</p><h1 className="page-title">Travel order records</h1><p className="page-subtitle">Browse published travel orders by office and travel date.</p></div><div className="intro-meta"><span className="status-dot" />Live public register</div></section>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <section className="records-panel" aria-label="Travel order records">
          <div className="panel-topline"><div><h2 className="panel-heading">Travel order register</h2><p className="panel-count">{filtered.length} {filtered.length === 1 ? "record" : "records"}{office === "all" ? " in the register" : ` in ${office}`}</p></div><div className="panel-controls"><label className="filter-control"><span className="select-wrap"><select value={office} onChange={(event) => { setOffice(event.target.value); setPage(1); }} aria-label="Filter by office"><option value="all">All offices</option><optgroup label="Divisions">{DIVISIONS.map((item) => <option key={item} value={item}>{item}</option>)}</optgroup><optgroup label="Special projects">{SPECIAL_PROJECTS.map((item) => <option key={item} value={item}>{item}</option>)}</optgroup>{additionalOffices.length > 0 && <optgroup label="Other offices">{additionalOffices.map((item) => <option key={item} value={item}>{item}</option>)}</optgroup>}</select></span></label><label className="search-control"><Search size={16} aria-hidden="true" /><input type="search" value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Name, travel no., destination..." aria-label="Search public travel orders" /></label></div></div>
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th>TO Date</th><th>Travel No.</th><th>Personnel</th><th>Office</th><th>Destination</th><th>Travel Dates</th></tr></thead>
            <tbody>{loading ? <tr><td className="table-state" colSpan={6}>Loading published travel orders...</td></tr> : visible.length ? visible.map((record) => <tr key={record.id}><td className="date-cell">{formatDate(record.toDate)}</td><td className="travel-number">{record.travelNo}</td><td className="personnel-cell">{record.personnel}</td><td className="office-cell">{record.office}</td><td className="destination-cell">{record.destination}</td><td className="travel-dates-cell">{formatTravelDates(record.dateFrom, record.dateTo)}</td></tr>) : <tr><td className="table-state" colSpan={6}><strong>{records.length ? searchTerm.trim() ? "No matching records" : "No records for this office" : "No travel orders published yet"}</strong><span>{records.length ? searchTerm.trim() ? "Try a different search term or adjust the office filter." : "Choose another office to see its register." : "Newly published travel orders will appear here."}</span></td></tr>}</tbody>
          </table></div>
          <div className="table-footer"><span>{filtered.length ? `Showing ${(displayPage - 1) * PAGE_SIZE + 1}-${Math.min(displayPage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : "Showing 0 records"}</span><nav className="pagination" aria-label="Records pages"><button type="button" title="Previous page" aria-label="Previous page" disabled={displayPage <= 1} onClick={() => setPage(displayPage - 1)}><ArrowLeft size={16} /></button><span className="page-number">{displayPage} / {pageCount}</span><button type="button" title="Next page" aria-label="Next page" disabled={displayPage >= pageCount} onClick={() => setPage(displayPage + 1)}><ArrowRight size={16} /></button></nav></div>
        </section>
        <footer className="site-footer"><span><strong>DA Records</strong> · Public travel order register</span><span>Newest travel dates appear first.</span></footer>
      </main>
    </>
  );
}
