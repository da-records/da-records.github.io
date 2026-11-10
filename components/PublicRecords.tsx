"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import LoadingProgress from "@/components/LoadingProgress";
import { db, initializeAnalytics } from "@/lib/firebase";
import { formatDate, OFFICES, orderFromDocument, type TravelOrder } from "@/lib/records";

const PAGE_SIZE = 10;

export default function PublicRecords() {
  const [records, setRecords] = useState<TravelOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [office, setOffice] = useState("all");
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

  const filtered = useMemo(() => office === "all" ? records : records.filter((record) => record.office === office), [office, records]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const displayPage = Math.min(page, pageCount);
  const visible = filtered.slice((displayPage - 1) * PAGE_SIZE, displayPage * PAGE_SIZE);

  return (
    <>
      <LoadingProgress loading={loading} />
      <header className="site-header">
        <Link className="brand-link" href="/" aria-label="Travel Order Records home"><Image className="brand-logo" src="/tor_logo_white.png" alt="Travel Order Records" width={490} height={180} priority /></Link>
        <div className="header-actions"><span className="header-note">Public register</span><Link className="header-link" href="/admin/"><LockKeyhole size={15} />Admin</Link></div>
      </header>
      <main className="page-shell">
        <section className="page-intro"><div><p className="eyebrow">Department of Agriculture</p><h1 className="page-title">Travel order records</h1><p className="page-subtitle">Browse published travel orders by office and travel date.</p></div><div className="intro-meta"><span className="status-dot" />Live public register</div></section>
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        <section className="records-panel" aria-label="Travel order records">
          <div className="panel-topline"><div><h2 className="panel-heading">Travel order register</h2><p className="panel-count">{filtered.length} {filtered.length === 1 ? "record" : "records"}{office === "all" ? " in the register" : ` in ${office}`}</p></div><label className="filter-control"><span>Filter by office</span><span className="select-wrap"><select value={office} onChange={(event) => { setOffice(event.target.value); setPage(1); }} aria-label="Filter by office"><option value="all">All offices</option>{OFFICES.map((item) => <option key={item}>{item}</option>)}</select></span></label></div>
          <div className="table-scroll"><table className="records-table">
            <thead><tr><th rowSpan={2}>Office</th><th rowSpan={2}>Travel No.</th><th rowSpan={2}>Personnel</th><th rowSpan={2}>Destination</th><th colSpan={2}>Travel Dates</th></tr><tr><th>Date From</th><th>Date To</th></tr></thead>
            <tbody>{loading ? <tr><td className="table-state" colSpan={6}>Loading published travel orders...</td></tr> : visible.length ? visible.map((record) => <tr key={record.id}><td className="office-cell">{record.office}</td><td className="travel-number">{record.travelNo}</td><td className="personnel-cell">{record.personnel}</td><td className="destination-cell">{record.destination}</td><td className="date-cell">{formatDate(record.dateFrom)}</td><td className="date-cell">{formatDate(record.dateTo)}</td></tr>) : <tr><td className="table-state" colSpan={6}><strong>{records.length ? "No records for this office" : "No travel orders published yet"}</strong><span>{records.length ? "Choose another office to see its register." : "Newly published travel orders will appear here."}</span></td></tr>}</tbody>
          </table></div>
          <div className="table-footer"><span>{filtered.length ? `Showing ${(displayPage - 1) * PAGE_SIZE + 1}-${Math.min(displayPage * PAGE_SIZE, filtered.length)} of ${filtered.length}` : "Showing 0 records"}</span><nav className="pagination" aria-label="Records pages"><button type="button" title="Previous page" aria-label="Previous page" disabled={displayPage <= 1} onClick={() => setPage(displayPage - 1)}><ArrowLeft size={16} /></button><span className="page-number">{displayPage} / {pageCount}</span><button type="button" title="Next page" aria-label="Next page" disabled={displayPage >= pageCount} onClick={() => setPage(displayPage + 1)}><ArrowRight size={16} /></button></nav></div>
        </section>
        <footer className="site-footer"><span><strong>DA Records</strong> · Public travel order register</span><span>Newest travel dates appear first.</span></footer>
      </main>
    </>
  );
}