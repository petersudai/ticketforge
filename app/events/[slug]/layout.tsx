export default function EventPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#06060e" }}>
      {children}
    </div>
  );
}
