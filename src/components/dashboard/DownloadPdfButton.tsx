import { useState } from 'react';
import { Download } from 'lucide-react';
import type { ClubData } from '@/hooks/useClubData';

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character] ?? character);

const formatNumber = (value: number) => new Intl.NumberFormat('uz-UZ').format(value);
const formatSom = (value: number) => `${formatNumber(value)} so'm`;
const formatDate = (value: string) => new Date(value).toLocaleString('uz-UZ');
const transactionLabels: Record<string, string> = {
  session: 'Seans tushumi',
  sale: 'Sotuv',
  purchase: 'Tovar xaridi',
  expense: 'Xarajat',
  cash_in: 'Pul kirimi',
  cash_out: 'Pul chiqimi',
  stock_opening: 'Omborga kirim',
  stock_adjustment: 'Qoldiq tahriri',
};
const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return `${hours} soat ${minutes} daqiqa ${remainder} soniya`;
};

function createTable(headers: string[], rows: string[][]) {
  const head = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}">Ma'lumot yo'q</td></tr>`;
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function createReport(data: ClubData) {
  const computerNames = new Map(data.computers.map((computer) => [computer.id, computer.name]));
  const products = createTable(
    ['ID', 'Mahsulot', 'Sotuv narxi', 'Tannarx', 'Qoldiq'],
    data.products.map((product) => [product.id, product.name, formatSom(product.price), formatSom(product.cost_price), formatNumber(product.stock)]),
  );
  const computers = createTable(
    ['ID', 'Kompyuter', 'Holati', 'Jami ishlagan vaqt'],
    data.computers.map((computer) => [
      computer.id,
      computer.name,
      computer.status === 'busy' ? 'Band' : computer.status === 'broken' ? 'Nosoz' : 'Bo‘sh',
      formatDuration(computer.total_runtime_seconds ?? 0),
    ]),
  );
  const sessions = createTable(
    ['Seans ID', 'Kompyuter ID', 'Kompyuter', 'Boshlangan', 'Tugagan', 'Davomiyligi'],
    data.computerSessions.map((session) => [
      session.id,
      session.computer_id,
      computerNames.get(session.computer_id) ?? session.computer_id,
      formatDate(session.started_at),
      session.ended_at ? formatDate(session.ended_at) : 'Davom etmoqda',
      session.duration_seconds === null ? 'Davom etmoqda' : formatDuration(session.duration_seconds),
    ]),
  );
  const transactions = createTable(
    ['Operatsiya ID', 'Sana', 'Turi', 'Sarlavha', 'Tafsilot', 'Mahsulot ID', 'Dona', 'Summa', 'Birlik narxi', 'Birlik tannarxi', 'Xodim', 'Lavozim'],
    data.transactions.map((transaction) => [
      transaction.id,
      formatDate(transaction.created_at),
      transactionLabels[transaction.kind] ?? transaction.kind,
      transaction.title,
      transaction.detail,
      transaction.product_id ?? '—',
      transaction.quantity === null || transaction.quantity === undefined ? '—' : formatNumber(transaction.quantity),
      formatSom(transaction.amount),
      transaction.unit_price === null || transaction.unit_price === undefined ? '—' : formatSom(transaction.unit_price),
      transaction.unit_cost === null || transaction.unit_cost === undefined ? '—' : formatSom(transaction.unit_cost),
      transaction.handled_by ?? '—',
      transaction.handled_as === 'manager' ? 'Menejer' : transaction.handled_as === 'operator' ? 'Operator' : '—',
    ]),
  );
  const totalStock = data.products.reduce((sum, product) => sum + product.stock, 0);
  const generatedAt = new Date().toLocaleString('uz-UZ');

  return `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SHON CLUB - To‘liq hisobot</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { color: #172033; font: 10px Arial, sans-serif; margin: 0; }
    h1 { font-size: 22px; margin: 0 0 5px; }
    h2 { border-bottom: 1px solid #cbd5e1; font-size: 15px; margin: 18px 0 8px; padding-bottom: 5px; }
    p { margin: 4px 0; }
    .summary { display: flex; gap: 20px; margin: 12px 0 18px; }
    .summary div { border: 1px solid #cbd5e1; border-radius: 5px; padding: 8px 12px; }
    table { border-collapse: collapse; font-size: 9px; table-layout: auto; width: 100%; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
    th, td { border: 1px solid #cbd5e1; padding: 5px; text-align: left; vertical-align: top; overflow-wrap: anywhere; }
    th { background: #e8eef6; }
    .section { break-before: page; page-break-before: always; }
    @media screen { body { margin: 24px auto; max-width: 1200px; padding: 0 20px; } }
  </style>
</head>
<body>
  <h1>SHON CLUB — To‘liq ma’lumotlar hisoboti</h1>
  <p>Yaratilgan vaqt: ${escapeHtml(generatedAt)}</p>
  <div class="summary">
    <div><strong>Mahsulotlar:</strong> ${data.products.length}</div>
    <div><strong>Ombordagi jami dona:</strong> ${formatNumber(totalStock)}</div>
    <div><strong>Kompyuterlar:</strong> ${data.computers.length}</div>
    <div><strong>Kompyuter seanslari:</strong> ${data.computerSessions.length}</div>
    <div><strong>Operatsiyalar:</strong> ${data.transactions.length}</div>
  </div>
  <section><h2>Mahsulotlar va ombor qoldig‘i</h2>${products}</section>
  <section class="section"><h2>Kompyuterlar holati va ishlagan vaqti</h2>${computers}</section>
  <section class="section"><h2>Kompyuter seanslari tarixi</h2>${sessions}</section>
  <section class="section"><h2>Barcha pul va ombor operatsiyalari</h2>${transactions}</section>
</body>
</html>`;
}

export function DownloadPdfButton({ data }: { data: ClubData | null }) {
  const [error, setError] = useState('');

  const downloadPdf = () => {
    if (!data) return;
    setError('');
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('PDF tayyorlash oynasi bloklandi. Brauzerda qalqib chiquvchi oynalarga ruxsat bering.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(createReport(data));
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      if (!printWindow.closed) printWindow.print();
    }, 500);
  };

  return <div className="flex flex-col items-end gap-1">
    <button type="button" onClick={downloadPdf} disabled={!data} className="inline-flex items-center gap-2 rounded-xl border border-brand-400/40 bg-brand-500/10 px-4 py-2.5 text-sm font-semibold text-brand-300 hover:bg-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50">
      <Download className="h-4 w-4" />PDF yuklab olish
    </button>
    {error && <p role="alert" className="max-w-xs text-right text-xs text-danger-300">{error}</p>}
  </div>;
}
