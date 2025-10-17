export default function StatusBadge({ value }: { value: string }) {
    const cls =
      value === "ACCEPTED" ? "badge green" :
      value === "REJECTED" ? "badge red" :
      value === "SENT"     ? "badge blue" :
      value === "QUEUED"   ? "badge amber" : "badge gray";
    return <span className={cls}>{value}</span>;
  }