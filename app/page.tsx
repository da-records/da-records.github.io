import PublicRecords from "@/components/PublicRecords";
import AccessCodeGate from "@/components/AccessCodeGate";

export default function Home() {
  return <AccessCodeGate><PublicRecords /></AccessCodeGate>;
}
