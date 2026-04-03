import React from "react";

export default function nav() {
  return (
    <nav
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(37,99,235,0.08)",
        padding: "0 3rem",
        height: 68,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "0 2px 20px rgba(37,99,235,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <img
          src="/658020267_1645369039831350_1863885405892434680_n.png"
          alt="SkinScan AI Logo"
          style={{ width: 50, height: 50 }}
        />
        <span
          style={{ fontSize: "1.25rem", fontWeight: "bold", color: "#2563eb" }}
        >
          SkinScan AI
        </span>
      </div>
      <div style={{ display: "flex", gap: "2.5rem" }}>
        {["หน้าแรก", "เกี่ยวกับ", "วิธีการทำงาน", "ติดต่อ"].map((l) => (
          <a key={l} href="#" className="nav-link">
            {l}
          </a>
        ))}
      </div>
    </nav>
  );
}
