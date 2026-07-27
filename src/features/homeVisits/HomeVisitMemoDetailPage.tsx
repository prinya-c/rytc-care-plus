import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAsync } from "../../hooks/useAsync";
import { fetchHomeVisitMemoById } from "./memoApi";
import { formatThaiDate } from "../../utils/thaiDate";
import { LoadingState, ErrorState } from "../../components/ui/States";
import { Button } from "../../components/ui/Form";
import { HomeVisitMemoPrintDocument } from "./HomeVisitMemoPrintDocument";

export default function HomeVisitMemoDetailPage() {
  const { memoId } = useParams();
  const [printing, setPrinting] = useState(false);

  const {
    data: memo,
    loading,
    error,
    refetch,
  } = useAsync(() => fetchHomeVisitMemoById(memoId!), [memoId]);

  useEffect(() => {
    if (!printing) return;
    const timer = setTimeout(() => window.print(), 50);
    return () => clearTimeout(timer);
  }, [printing]);

  useEffect(() => {
    function handleAfterPrint() {
      setPrinting(false);
    }
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  if (loading) return <LoadingState />;
  if (error || !memo)
    return <ErrorState onRetry={refetch} title="ไม่พบบันทึกข้อความเยี่ยมบ้านนี้" />;

  return (
    <div className="space-y-5 print:space-y-0">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            บันทึกข้อความเยี่ยมบ้าน ครั้งที่ {memo.roundNumber || "-"}
          </h1>
          <p className="text-sm text-gray-500">
            ระดับชั้น {memo.level || "-"} ·{" "}
            {memo.memoDate ? formatThaiDate(memo.memoDate) : "ไม่ระบุวันที่"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/home-visits/memo/${memo.id}/edit`}
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            แก้ไข
          </Link>
          <Button variant="secondary" onClick={() => setPrinting(true)}>
            พิมพ์บันทึกข้อความเยี่ยมบ้าน
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 print:hidden">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">
            นักเรียนในความดูแล
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {memo.totalStudents}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-medium text-gray-500">เยี่ยมบ้านแล้ว</p>
          <p className="mt-2 text-3xl font-bold text-trust-700">
            {memo.visitedCount}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 text-sm leading-relaxed shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-8">
        <HomeVisitMemoPrintDocument memo={memo} />
      </div>
    </div>
  );
}
