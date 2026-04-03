"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const API_URL = "http://localhost:8000/predict";

type Probabilities = Record<string, number>;

interface PredictionResult {
  prediction: string;
  confidence: number;
  probabilities: Probabilities;
}

// ── Guidance data per condition ──────────────────────────────────────────────
const GUIDANCE: Record<
  string,
  {
    riskLevel: string;
    medical: string[];
    cosmetic: string[];
    symptoms: string;
    characteristics: string;
    cause: string;
    more: string;
  }
> = {
  "Skin Cancer": {
    riskLevel: "High",
    symptoms:
      "แผลไม่หายภายในหลายสัปดาห์ มีเลือดออกง่ายหรือเป็นสะเก็ดซ้ำ ๆ อาจมีอาการคัน เจ็บ หรือแสบ ไฝหรือปื้นผิวหนังมีการเปลี่ยนแปลง เช่น โตเร็ว สีไม่สม่ำเสมอ ขอบไม่เรียบ หรือมีหลายสีในจุดเดียว",
    characteristics: "ก้อนหรือแผลผิดปกติ",
    cause: "UV ทำลาย DNA",
    more: "มีหลายชนิด เช่น melanoma",
    medical: [
      "ควรพบแพทย์ผิวหนังโดยเร็วที่สุดเพื่อตรวจ Biopsy",
      "หลีกเลี่ยงแสงแดดโดยตรง และสวมเสื้อผ้าปกคลุมผิวหนัง",
      "ห้ามใช้ยาหรือครีมทาเองโดยไม่ปรึกษาแพทย์",
    ],
    cosmetic: [
      "ทา Broad-spectrum SPF 50+ sunscreen ทุกวัน",
      "หลีกเลี่ยงการใช้ผลิตภัณฑ์ที่ระคายเคืองบริเวณรอยโรค",
      "ใช้ผ้าปิดหรือพลาสเตอร์ทางการแพทย์เพื่อปกป้องบริเวณที่สงสัย",
    ],
  },
  Psoriasis: {
    riskLevel: "Medium",
    symptoms:
      "คัน แสบ ผิวลอกเป็นขุย อาจมีเลือดซึมเมื่อแกะสะเก็ด (Auspitz sign) บางรายมีปวดข้อร่วม",
    characteristics: "ผื่นแดง ขุยสีเงิน หนา",
    cause: "ภูมิคุ้มกันผิดปกติ",
    more: "เป็นเรื้อรัง",
    medical: [
      "ปรึกษาแพทย์ผิวหนังเพื่อวางแผนการรักษาระยะยาว",
      "หลีกเลี่ยงสิ่งกระตุ้น เช่น ความเครียด การติดเชื้อ และสภาพอากาศแห้ง",
      "แพทย์อาจแนะนำยาทา Corticosteroid, Vitamin D analogues หรือยารับประทาน",
    ],
    cosmetic: [
      "ทามอยเจอไรเซอร์ที่เข้มข้นสูงเป็นประจำเพื่อลดการลอกของผิว",
      "ใช้ผลิตภัณฑ์ที่มี Salicylic Acid อ่อนๆ เพื่อช่วยผลัดเซลล์ผิว",
      "หลีกเลี่ยงการขัดผิวแรงๆ บริเวณรอยโรค",
    ],
  },
  "Herpes Simplex": {
    riskLevel: "Medium",
    symptoms:
      "แสบร้อนหรือคันก่อนเกิดตุ่มน้ำ ตุ่มน้ำใสเป็นกลุ่มแล้วแตกเป็นแผลตื้น เจ็บบริเวณแผล อาจมีไข้และต่อมน้ำเหลืองโต",
    characteristics: "ตุ่มน้ำใสเป็นกลุ่มบริเวณริมฝีปากหรืออวัยวะเพศ",
    cause: "การติดเชื้อไวรัส Herpes Simplex Virus (HSV)",
    more: "สามารถกลับมาเป็นซ้ำได้เมื่อภูมิคุ้มกันต่ำ",
    medical: [
      "ปรึกษาแพทย์เพื่อรับยาต้านไวรัส (Acyclovir, Valacyclovir) โดยเร็ว",
      "หลีกเลี่ยงการสัมผัสแผลเริมแล้วจับส่วนอื่นของร่างกาย",
      "งดจูบหรือใช้ของร่วมกับผู้อื่นขณะมีแผลเริมที่ปาก",
    ],
    cosmetic: [
      "ใช้ลิปบาล์มที่มี SPF เพื่อป้องกันแสงแดดกระตุ้นเริม",
      "หลีกเลี่ยงการแต่งหน้าบริเวณแผลเริม",
      "รักษาความชุ่มชื้นบริเวณรอบแผลด้วยมอยเจอไรเซอร์อ่อนโยน",
    ],
  },
  Abscess: {
    riskLevel: "Medium",
    symptoms:
      "เจ็บ ปวด บวม แดง ร้อนบริเวณก้อน อาจรู้สึกตุบ ๆ มีไข้ในบางราย เมื่อฝีสุกอาจมีหนองไหลออกและปวดลดลง",
    characteristics: "ก้อนแดงมีหนองตรงกลาง",
    cause: "การติดเชื้อแบคทีเรียในรูขุมขน",
    more: "สามารถเกิดได้หลายรูปแบบ",
    medical: [
      "ห้ามบีบหรือเจาะฝีเอง เพราะอาจทำให้ติดเชื้อลุกลาม",
      "พบแพทย์เพื่อเจาะระบายหนอง (Incision & Drainage) อย่างปลอดเชื้อ",
      "แพทย์อาจสั่งยาปฏิชีวนะหากมีการติดเชื้อรุนแรงหรือมีไข้",
    ],
    cosmetic: [
      "รักษาความสะอาดบริเวณรอบฝีด้วยน้ำเกลือหรือสบู่อ่อนโยน",
      "ใช้ผ้าก๊อซปลอดเชื้อปิดแผลและเปลี่ยนเป็นประจำ",
      "หลีกเลี่ยงการใช้ครีมหรือเครื่องสำอางบริเวณที่เป็นฝี",
    ],
  },
  "Contact Dermatitis": {
    riskLevel: "Medium",
    symptoms:
      "ผิวแดง คันมาก แสบหรือระคายเคือง มีตุ่มน้ำหรือผิวลอก อาจบวมและแห้งแตกในระยะเรื้อรัง",
    characteristics: "พบได้จากสารเคมีในชีวิตประจำวัน",
    cause: "การสัมผัสสารก่อภูมิแพ้หรือสารระคายเคือง",
    more: "เป็นโรคที่พบได้ทั่วไป",
    medical: [
      "ระบุและหลีกเลี่ยงสารที่ทำให้เกิดอาการแพ้ (Allergen/Irritant)",
      "ปรึกษาแพทย์เพื่อทำ Patch Test หาสารก่อภูมิแพ้",
      "แพทย์อาจสั่งยาทา Steroid cream หรือยาแก้แพ้เพื่อลดอาการ",
    ],
    cosmetic: [
      "ใช้ผลิตภัณฑ์ Hypoallergenic และปราศจากน้ำหอม",
      "ทา Barrier cream ก่อนสัมผัสสารที่อาจระคายเคือง",
      "ทามอยเจอไรเซอร์ที่มี Ceramide เพื่อซ่อมแซม skin barrier",
    ],
  },
  "Nummular Dermatitis": {
    riskLevel: "Medium",
    symptoms:
      "คันมาก โดยเฉพาะกลางคืน ผื่นแดงเป็นวง อาจมีน้ำเหลืองซึมหรือสะเก็ด ผิวแห้งและแตก",
    characteristics: "ผื่นวงกลมคล้ายเหรียญ",
    cause: "ยังไม่ทราบสาเหตุแน่ชัด อาจเกี่ยวกับผิวแห้งและสิ่งแวดล้อม",
    more: "เป็นเรื้อรัง",
    medical: [
      "ปรึกษาแพทย์ผิวหนังเพื่อรับยาทา Steroid cream ลดอาการอักเสบ",
      "หลีกเลี่ยงการอาบน้ำร้อนและสารระคายเคืองที่ทำให้ผิวแห้ง",
      "แพทย์อาจสั่งยาแก้แพ้เพื่อลดอาการคันรุนแรง",
    ],
    cosmetic: [
      "ทามอยเจอไรเซอร์เข้มข้นหลังอาบน้ำทันทีเพื่อกักเก็บความชุ่มชื้น",
      "เลือกผลิตภัณฑ์ปราศจากน้ำหอมและสี (Fragrance-free)",
      "ใช้สบู่อ่อนโยนที่ไม่ทำลาย skin barrier",
    ],
  },
  "Cutaneous Candidiasis": {
    riskLevel: "Medium",
    symptoms:
      "คัน แสบ ผิวเปื่อย อาจมีอาการเจ็บ โดยเฉพาะบริเวณที่อับชื้น เช่น ซอกพับ",
    characteristics: "ผื่นแดงชื้น มีตุ่มเล็ก ๆ รอบ",
    cause: "เชื้อรา Candida เจริญในที่อับชื้น",
    more: "พบในคนอ้วนหรือเบาหวาน",
    medical: [
      "ปรึกษาแพทย์เพื่อรับยาต้านเชื้อรา (Antifungal) ทาหรือรับประทาน",
      "รักษาบริเวณที่ติดเชื้อให้แห้งและสะอาด",
      "ผู้ที่มีโรคเบาหวานหรือภูมิคุ้มกันต่ำควรเฝ้าระวังเป็นพิเศษ",
    ],
    cosmetic: [
      "สวมเสื้อผ้าที่ระบายอากาศได้ดี หลีกเลี่ยงผ้าที่อับชื้น",
      "ใช้แป้งดูดซับความชื้นบริเวณข้อพับผิวหนัง",
      "หลีกเลี่ยงผลิตภัณฑ์ที่มีน้ำหอมหรือสารระคายเคืองบริเวณที่ติดเชื้อ",
    ],
  },
  "Otitis Media": {
    riskLevel: "Medium",
    symptoms:
      "ปวดหูอย่างชัดเจน หูอื้อ การได้ยินลดลง อาจมีไข้ เด็กเล็กอาจร้องกวนหรือจับหูบ่อย ในบางรายมีน้ำหรือหนองไหล",
    characteristics: "อักเสบของหูชั้นกลาง",
    cause: "การติดเชื้อ",
    more: "พบในเด็กบ่อย",
    medical: [
      "ควรพบแพทย์หู คอ จมูก เพื่อตรวจวินิจฉัยและรับการรักษาที่เหมาะสม",
      "แพทย์อาจสั่งยาปฏิชีวนะหากเป็นการติดเชื้อแบคทีเรีย",
      "ห้ามแคะหรือล้างหูเอง เพราะอาจทำให้เยื่อแก้วหูทะลุ",
    ],
    cosmetic: [
      "รักษาบริเวณรอบหูให้แห้งและสะอาด",
      "หลีกเลี่ยงน้ำเข้าหูขณะอาบน้ำหรือว่ายน้ำ",
      "ใช้มอยเจอไรเซอร์อ่อนโยนบริเวณผิวรอบหูหากมีอาการแห้งลอก",
    ],
  },
  Cellulitis: {
    riskLevel: "High",
    symptoms:
      "ปวด บวม แดง ร้อน ผิวตึง อาจมีไข้ หนาวสั่น อ่อนเพลีย บริเวณผิวหนังลุกลามรวดเร็ว กดแล้วเจ็บ",
    characteristics: "ผื่นแดงลาม ขอบไม่ชัด",
    cause: "การติดเชื้อแบคทีเรียลึกในชั้นผิว",
    more: "อาจรุนแรงถึงกระแสเลือด",
    medical: [
      "ควรพบแพทย์ทันทีเพราะ Cellulitis อาจลุกลามอย่างรวดเร็ว",
      "ต้องรักษาด้วยยาปฏิชีวนะตามแพทย์สั่ง ห้ามหยุดยาเอง",
      "หากมีไข้สูง หนาวสั่น หรืออาการแย่ลง ให้ไปห้องฉุกเฉินทันที",
    ],
    cosmetic: [
      "ยกบริเวณที่บวมให้สูงขึ้นเพื่อลดอาการบวม",
      "รักษาความสะอาดบริเวณแผลด้วยน้ำเกลือ",
      "หลีกเลี่ยงการใช้ครีมหรือเครื่องสำอางบริเวณที่อักเสบ",
    ],
  },
  Shingles: {
    riskLevel: "High",
    symptoms:
      "ปวดแสบปวดร้อนมากก่อนเกิดผื่น มีอาการเสียวหรือชาเป็นแนวเดียวกัน ต่อมาจะมีตุ่มน้ำใสขึ้นและแตกเป็นแผล อาจมีไข้หรืออ่อนเพลีย",
    characteristics: "ตุ่มน้ำเรียงตามแนวเส้นประสาท ขึ้นข้างเดียว",
    cause: "การกลับมาทำงานของไวรัส Varicella-Zoster",
    more: "อาจปวดเรื้อรังหลังหาย",
    medical: [
      "ควรพบแพทย์ภายใน 72 ชั่วโมงเพื่อรับยาต้านไวรัส (Acyclovir, Valacyclovir)",
      "ห้ามเกาหรือแกะตุ่มน้ำ เพราะอาจทำให้ติดเชื้อซ้ำหรือเกิดแผลเป็น",
      "ระวังการแพร่เชื้อไปยังผู้ที่ไม่เคยเป็นอีสุกอีใส โดยเฉพาะทารกและหญิงตั้งครรภ์",
    ],
    cosmetic: [
      "ใช้ผ้าก๊อซปลอดเชื้อปิดแผลเพื่อป้องกันการแพร่เชื้อ",
      "ทา Calamine lotion เพื่อบรรเทาอาการคัน",
      "สวมเสื้อผ้าหลวมสบายเพื่อลดการเสียดสีบริเวณผื่น",
    ],
  },
};

const THAI_NAMES: Record<string, string> = {
  "Skin Cancer": "โรคมะเร็งผิวหนัง",
  Psoriasis: "โรคสะเก็ดเงิน",
  "Herpes Simplex": "โรคเริม",
  Abscess: "โรคฝี",
  "Contact Dermatitis": "โรคผื่นแพ้สัมผัส",
  "Nummular Dermatitis": "โรคผิวหนังอักเสบชนิดเหรียญ",
  "Cutaneous Candidiasis": "โรคผิวหนังจากเชื้อราแคนดิดา",
  "Otitis Media": "โรคหูน้ำหนวก",
  Cellulitis: "โรคเซลลูไลติส",
  Shingles: "โรคงูสวัด",
};

const DEFAULT_GUIDANCE = {
  riskLevel: "Medium",
  symptoms: "ยังไม่สามารถระบุอาการได้",
  characteristics: "ยังไม่สามารถระบุลักษณะได้",
  cause: "ยังไม่ทราบสาเหตุ",
  more: "ควรปรึกษาแพทย์ผิวหนังเพื่อรับการวินิจฉัยที่ถูกต้อง",
  medical: [
    "ควรพบแพทย์ผิวหนังเพื่อรับการวินิจฉัยที่ถูกต้อง",
    "หลีกเลี่ยงการเกา หรือสัมผัสบริเวณรอยโรคโดยไม่จำเป็น",
    "บันทึกการเปลี่ยนแปลงของรอยโรคเพื่อแจ้งแพทย์",
  ],
  cosmetic: [
    "ทาครีมกันแดด SPF 30+ ทุกวันเพื่อปกป้องผิว",
    "ใช้ผลิตภัณฑ์ที่ปราศจากน้ำหอมและสารระคายเคือง",
    "รักษาความสะอาดบริเวณรอยโรคด้วยสบู่อ่อนโยน",
  ],
};

function getRiskColor(level: string) {
  if (level === "High")
    return {
      bg: "#fef2f2",
      border: "#fecaca",
      text: "#dc2626",
      dot: "#ef4444",
    };
  if (level === "Medium")
    return {
      bg: "#fffbeb",
      border: "#fde68a",
      text: "#d97706",
      dot: "#f59e0b",
    };
  return { bg: "#f0fdf4", border: "#bbf7d0", text: "#16a34a", dot: "#22c55e" };
}

function ConfBar({
  label,
  score,
  isTop,
}: {
  label: string;
  score: number;
  isTop: boolean;
}) {
  const [width, setWidth] = useState(0);
  const pct = Math.round(score * 100);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "110px 1fr 46px",
        alignItems: "center",
        gap: "0.75rem",
        marginBottom: "0.65rem",
        fontSize: "0.78rem",
        color: isTop ? "#0f172a" : "#64748b",
        fontWeight: isTop ? 600 : 400,
      }}
    >
      <span
        style={{
          textTransform: "capitalize",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {label}
      </span>
      <div
        style={{
          height: 8,
          background: "#e2e8f0",
          borderRadius: 99,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: isTop
              ? "linear-gradient(90deg,#0ea5e9,#2563eb)"
              : "#bfdbfe",
            borderRadius: 99,
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      <span
        style={{
          textAlign: "right",
          color: isTop ? "#2563eb" : undefined,
          fontWeight: isTop ? 700 : undefined,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ── Result Card ──────────────────────────────────────────────────────────────
function ResultCard({
  result,
  sortedProbs,
}: {
  result: {
    prediction: string;
    confidence: number;
    probabilities: Record<string, number>;
  };
  sortedProbs: [string, number][];
}) {
  const guidance = GUIDANCE[result.prediction] ?? DEFAULT_GUIDANCE;
  const risk = getRiskColor(guidance.riskLevel);
  const conf = Math.round(result.confidence * 100);

  return (
    <div
      style={{
        animation: "fadeUp 0.4s ease",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* ── Top: Diagnosis banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%)",
          borderRadius: 20,
          padding: "1.75rem 2rem",
          boxShadow: "0 8px 32px rgba(37,99,235,0.25)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -30,
            right: -30,
            width: 140,
            height: 140,
            background: "rgba(255,255,255,0.07)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -20,
            left: 80,
            width: 90,
            height: 90,
            background: "rgba(255,255,255,0.05)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.18)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              flexShrink: 0,
            }}
          >
            🔬
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.7)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "0.2rem",
              }}
            >
              ผลการวิเคราะห์
            </div>
            <div
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "white",
                textTransform: "capitalize",
                lineHeight: 1.1,
              }}
            >
              {result.prediction}
            </div>
            {THAI_NAMES[result.prediction] && (
              <div
                style={{
                  fontSize: "0.85rem",
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 500,
                  marginTop: "0.2rem",
                }}
              >
                {THAI_NAMES[result.prediction]}
              </div>
            )}
          </div>
          {/* Confidence circle */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(10px)",
                border: "3px solid rgba(255,255,255,0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: "1.2rem",
                  fontWeight: 800,
                  color: "white",
                  lineHeight: 1,
                }}
              >
                {conf}%
              </div>
              <div
                style={{
                  fontSize: "0.5rem",
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                confidence
              </div>
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            marginTop: "1.25rem",
            paddingTop: "1rem",
            borderTop: "1px solid rgba(255,255,255,0.15)",
            position: "relative",
            zIndex: 1,
            flexWrap: "wrap",
          }}
        >
          {[{ icon: "⚠️", label: "Risk Level", value: guidance.riskLevel }].map(
            (m) => (
              <div
                key={m.label}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span style={{ fontSize: "0.9rem" }}>{m.icon}</span>
                <div>
                  <div
                    style={{
                      fontSize: "0.62rem",
                      color: "rgba(255,255,255,0.6)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {m.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.82rem",
                      color: "white",
                      fontWeight: 700,
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              </div>
            ),
          )}
          {/* Risk dot */}
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: risk.dot,
                boxShadow: `0 0 8px ${risk.dot}`,
              }}
            />
            <span
              style={{
                fontSize: "0.75rem",
                color: "rgba(255,255,255,0.8)",
                fontWeight: 600,
              }}
            >
              {guidance.riskLevel === "High"
                ? "ควรพบแพทย์ด่วน"
                : guidance.riskLevel === "Medium"
                  ? "ควรพบแพทย์"
                  : "ความเสี่ยงต่ำ"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Disease Info ── */}
      <div
        style={{
          background: "white",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid #e8f0fe",
          boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #bae6fd",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>📖</span>
          <div
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "#0369a1",
            }}
          >
            ข้อมูลโรค{THAI_NAMES[result.prediction] ? ` — ${THAI_NAMES[result.prediction]}` : ""}
          </div>
        </div>
        <div
          style={{
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {[
            { icon: "🩺", label: "อาการ", value: guidance.symptoms },
            { icon: "🔍", label: "ลักษณะ", value: guidance.characteristics },
            { icon: "⚙️", label: "สาเหตุ", value: guidance.cause },
            { icon: "📌", label: "ข้อมูลเพิ่มเติม", value: guidance.more },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "linear-gradient(135deg, #f0f9ff, #e0f2fe)",
                  border: "1px solid #bae6fd",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "0.85rem",
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#0369a1",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: "0.15rem",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "0.82rem",
                    color: "#374151",
                    lineHeight: 1.65,
                  }}
                >
                  {item.value}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Medical Guidance ── */}
      <div
        style={{
          background: "white",
          borderRadius: 18,
          overflow: "hidden",
          border: `1px solid ${risk.border}`,
          boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
        }}
      >
        <div
          style={{
            background: risk.bg,
            padding: "1rem 1.5rem",
            borderBottom: `1px solid ${risk.border}`,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🏥</span>
          <div
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              color: risk.text,
            }}
          >
            Medical Guidance{THAI_NAMES[result.prediction] ? ` — ${THAI_NAMES[result.prediction]}` : ""}
          </div>
        </div>
        <div
          style={{
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
          }}
        >
          {guidance.medical.map((tip, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.65rem",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: risk.bg,
                  border: `1px solid ${risk.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: risk.dot,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "#374151",
                  lineHeight: 1.65,
                }}
              >
                {tip}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cosmetic Guidance ── */}
      <div
        style={{
          background: "white",
          borderRadius: 18,
          overflow: "hidden",
          border: "1px solid #bfdbfe",
          boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #bfdbfe",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>✨</span>
          <div
            style={{
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "#2563eb",
            }}
          >
            Cosmetic Guidance for {result.prediction}{THAI_NAMES[result.prediction] ? ` (${THAI_NAMES[result.prediction]})` : ""}
          </div>
        </div>
        <div
          style={{
            padding: "1.25rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.7rem",
          }}
        >
          {guidance.cosmetic.map((tip, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.65rem",
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                  border: "1px solid #bfdbfe",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                  fontSize: "0.7rem",
                }}
              >
                ✓
              </div>
              <span
                style={{
                  fontSize: "0.82rem",
                  color: "#374151",
                  lineHeight: 1.65,
                }}
              >
                {tip}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            margin: "0 1.5rem 1.25rem",
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 10,
            padding: "0.75rem 1rem",
            fontSize: "0.72rem",
            color: "#92400e",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          ⚠️ ข้อมูลเหล่านี้เป็นเพียงคำแนะนำเบื้องต้น
          ไม่ใช่การวินิจฉัยทางการแพทย์ — ควรปรึกษาแพทย์ผิวหนังเสมอ
        </div>
      </div>

      {/* ── Probability bars ── */}
      <div
        style={{
          background: "white",
          borderRadius: 18,
          padding: "1.5rem",
          border: "1px solid #e8f0fe",
          boxShadow: "0 2px 16px rgba(37,99,235,0.06)",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "#64748b",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          รายละเอียดความมั่นใจ
        </div>
        {sortedProbs.map(([label, score], i) => (
          <ConfBar key={label} label={label} score={score} isTop={i === 0} />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const analyserRef = useRef<HTMLDivElement>(null);

  const loadFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  }, []);

  const clearImage = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const runPrediction = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(API_URL, { method: "POST", body: form });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: PredictionResult = await res.json();
      setResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const sortedProbs = result?.probabilities
    ? Object.entries(result.probabilities).sort((a, b) => b[1] - a[1])
    : [];

  const scrollToAnalyser = () =>
    analyserRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const stats = [
    { value: "92%", label: "ความแม่นยำของโมเดล", icon: "🎯" },
    { value: "10", label: "โรคผิวหนัง", icon: "🔬" },
    { value: "<2s", label: "เวลาวิเคราะห์", icon: "⚡" },
    { value: "100%", label: "เป็นส่วนตัว & ปลอดภัย", icon: "🔒" },
  ];

  const conditions = [
    "Psoriasis",
    "Herpes Simplex",
    "Skin Cancer",
    "Abscess",
    "Contact Dermatitis",
    "Nummular Dermatitis",
    "Cutaneous Candidiasis",
    "Otitis Media",
    "Cellulitis",
    "Shingles",
  ];

  const features = [
    {
      icon: "🧬",
      title: "Xception Architecture",
      desc: "Deep CNN ฝึกกับภาพโรคผิวหนัง 1,657 ภาพ โดยใช้ ImageNet transfer learning.",
    },
    {
      icon: "⚡",
      title: "ผลลัพธ์ทันที",
      desc: "แสดงความน่าจะเป็นของทั้ง 10 โรคในเวลาไม่ถึง 2 วินาที.",
    },
    {
      icon: "🔒",
      title: "ออกแบบให้เป็นส่วนตัว",
      desc: "รูปภาพของคุณจะไม่ถูกจัดเก็บหรือบันทึกหลังวิเคราะห์เสร็จ.",
    },
    {
      icon: "📋",
      title: "10 Conditions",
      desc: "Psoriasis · Herpes Simplex · Skin Cancer · Abscess · Contact Dermatitis · Nummular Dermatitis · Cutaneous Candidiasis · Otitis Media · Cellulitis · Shingles",
    },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: #f0f6ff; color: #0f172a; min-height: 100vh; overflow-x: hidden; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 0.6; } 50% { transform: scale(1.05); opacity: 0.2; } 100% { transform: scale(0.9); opacity: 0.6; } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes blob { 0%,100% { border-radius: 60% 40% 30% 70%/60% 30% 70% 40%; } 50% { border-radius: 30% 60% 70% 40%/50% 60% 30% 60%; } }
        .hero-blob { animation: blob 8s ease-in-out infinite; }
        .float-card { animation: float 4s ease-in-out infinite; }
        .nav-link { text-decoration: none; color: #64748b; font-weight: 500; font-size: 0.875rem; transition: color 0.2s; font-family: 'DM Sans', sans-serif; }
        .nav-link:hover { color: #2563eb; }
        .btn-primary { background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; border: none; border-radius: 50px; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.95rem; padding: 0.85rem 2rem; cursor: pointer; box-shadow: 0 6px 24px rgba(37,99,235,0.35); transition: transform 0.2s, box-shadow 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(37,99,235,0.45); }
        .btn-secondary { background: rgba(255,255,255,0.9); color: #2563eb; border: 2px solid rgba(37,99,235,0.2); border-radius: 50px; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 0.95rem; padding: 0.85rem 2rem; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 0.5rem; backdrop-filter: blur(10px); }
        .btn-secondary:hover { background: white; border-color: #2563eb; transform: translateY(-2px); }
        .stat-card { background: rgba(255,255,255,0.85); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.9); border-radius: 16px; padding: 1.25rem 1.5rem; text-align: center; box-shadow: 0 4px 20px rgba(37,99,235,0.08); transition: transform 0.2s, box-shadow 0.2s; }
        .stat-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(37,99,235,0.14); }
        .feature-card { background: white; border-radius: 20px; padding: 1.5rem; display: flex; align-items: flex-start; gap: 1rem; box-shadow: 0 2px 16px rgba(37,99,235,0.07); border: 1px solid #e8f0fe; transition: transform 0.2s, box-shadow 0.2s; }
        .feature-card:hover { transform: translateY(-3px); box-shadow: 0 8px 32px rgba(37,99,235,0.12); }
        .upload-zone { border: 2px dashed #bfdbfe; border-radius: 16px; background: #eff6ff; padding: 2.5rem 2rem; text-align: center; cursor: pointer; transition: all 0.2s; }
        .upload-zone:hover, .upload-zone.dragging { border-color: #2563eb; background: #dbeafe; }
        .analyse-btn { width: 100%; background: linear-gradient(135deg, #2563eb, #0ea5e9); color: white; border: none; border-radius: 14px; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 1rem; padding: 1rem; cursor: pointer; box-shadow: 0 4px 18px rgba(37,99,235,0.35); transition: opacity 0.2s, transform 0.2s; }
        .analyse-btn:hover:not(:disabled) { transform: translateY(-1px); }
        .analyse-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        @media (max-width: 900px) { .hero-grid { grid-template-columns: 1fr !important; } .hero-visual { display: none !important; } .analyser-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* ── HERO ── */}
      <section
        style={{
          background:
            "linear-gradient(160deg, #e8f3ff 0%, #dbeafe 40%, #e0f2fe 100%)",
          minHeight: "calc(100vh - 68px)",
          position: "relative",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-5%",
            width: 500,
            height: 500,
            background: "rgba(37,99,235,0.08)",
            borderRadius: "60% 40% 30% 70%/60% 30% 70% 40%",
            filter: "blur(1px)",
          }}
          className="hero-blob"
        />
        <div
          style={{
            position: "absolute",
            bottom: "-15%",
            left: "-8%",
            width: 400,
            height: 400,
            background: "rgba(14,165,233,0.07)",
            borderRadius: "40% 60% 70% 30%/40% 50% 60% 50%",
          }}
        />
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "4rem 3rem",
            width: "100%",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div
            className="hero-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4rem",
              alignItems: "center",
            }}
          >
            <div style={{ animation: "slideIn 0.6s ease both" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(37,99,235,0.1)",
                  border: "1px solid rgba(37,99,235,0.2)",
                  borderRadius: 50,
                  padding: "0.4rem 1rem",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "#2563eb",
                  marginBottom: "1.5rem",
                  backdropFilter: "blur(10px)",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    background: "#2563eb",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "pulse-ring 2s ease infinite",
                  }}
                />
                เครื่องมือวิเคราะห์โรคผิวหนังด้วย AI
              </div>
              <h1
                style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: "clamp(2.4rem, 4vw, 3.6rem)",
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: "#0f172a",
                  marginBottom: "1.25rem",
                  letterSpacing: "-0.02em",
                }}
              >
                คู่หูของคุณใน
                <br />
                <span style={{ color: "#2563eb" }}>สุขภาพผิว</span>
              </h1>
              <p
                style={{
                  fontSize: "1.05rem",
                  color: "#475569",
                  lineHeight: 1.75,
                  maxWidth: 480,
                  marginBottom: "2.25rem",
                }}
              >
                อัปโหลดภาพผิวหนังของคุณเพื่อรับการวิเคราะห์ด้วย AI ทันที
                <br />
                ครอบคลุม 10 โรค — รวดเร็ว ฟรี และเป็นส่วนตัว
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  flexWrap: "wrap",
                  marginBottom: "3rem",
                }}
              >
                <button className="btn-primary" onClick={scrollToAnalyser}>
                  🔬 วิเคราะห์เลย
                </button>
                <button className="btn-secondary">▶ ดูวิธีการทำงาน</button>
              </div>
              <div
                style={{
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255,255,255,0.95)",
                  borderRadius: 18,
                  padding: "1.1rem 1.5rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "1.5rem",
                  boxShadow: "0 8px 32px rgba(37,99,235,0.1)",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { label: "อัปโหลด", value: "รูปภาพของคุณ", icon: "📷" },
                  { label: "วินิจฉัย", value: "AI ตรวจจับ", icon: "🔬" },
                  { label: "ผลลัพธ์", value: "รายงานทันที", icon: "📋" },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.65rem",
                      flex: 1,
                      minWidth: 120,
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                        borderRadius: 10,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                      }}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "#94a3b8",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {item.label}
                      </div>
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#0f172a",
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                    {i < 2 && (
                      <div
                        style={{
                          width: 1,
                          height: 32,
                          background: "#e2e8f0",
                          marginLeft: "auto",
                        }}
                      />
                    )}
                  </div>
                ))}
                <button
                  className="btn-primary"
                  style={{
                    fontSize: "0.82rem",
                    padding: "0.7rem 1.3rem",
                    whiteSpace: "nowrap",
                  }}
                  onClick={scrollToAnalyser}
                >
                  เริ่มต้น →
                </button>
              </div>
            </div>
            <div
              className="hero-visual"
              style={{
                position: "relative",
                height: 560,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 380,
                  height: 420,
                  background:
                    "linear-gradient(160deg,#bfdbfe,#dbeafe 60%,#e0f2fe)",
                  borderRadius: "40% 60% 55% 45% / 50% 45% 55% 50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: "0 20px 60px rgba(37,99,235,0.18)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: "9rem",
                    opacity: 0.15,
                    userSelect: "none",
                    position: "absolute",
                  }}
                >
                  ⚕
                </div>
                <img
                  src="/docteam.png"
                  alt="Medical team"
                  style={{
                    width: "110%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                    position: "relative",
                    zIndex: 1,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
              <div
                style={{
                  position: "absolute",
                  top: 100,
                  left: -30,
                  background: "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(20px)",
                  borderRadius: "50%",
                  width: 80,
                  height: 80,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 32px rgba(37,99,235,0.14)",
                  border: "2px solid rgba(37,99,235,0.15)",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.3rem",
                    color: "#2563eb",
                    lineHeight: 1,
                  }}
                >
                  92%
                </div>
                <div
                  style={{
                    fontSize: "0.55rem",
                    color: "#64748b",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  ความแม่นยำ
                </div>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1.25rem",
              marginTop: "3.5rem",
            }}
          >
            {stats.map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ fontSize: "1.4rem", marginBottom: "0.4rem" }}>
                  {s.icon}
                </div>
                <div
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 800,
                    fontSize: "1.8rem",
                    color: "#2563eb",
                    lineHeight: 1,
                    marginBottom: "0.2rem",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#64748b",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          onClick={scrollToAnalyser}
          style={{
            position: "absolute",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.3rem",
            cursor: "pointer",
            color: "#94a3b8",
            animation: "float 2.5s ease-in-out infinite",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            วิเคราะห์เลย
          </span>
          <div style={{ fontSize: "1.2rem" }}>↓</div>
        </div>
      </section>

      {/* ── ANALYSER ── */}
      <section
        ref={analyserRef}
        style={{ background: "#f8faff", padding: "5rem 0" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 3rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <div
              style={{
                display: "inline-block",
                background: "rgba(37,99,235,0.08)",
                border: "1px solid rgba(37,99,235,0.15)",
                borderRadius: 50,
                padding: "0.35rem 1rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#2563eb",
                marginBottom: "1rem",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              AI วิเคราะห์
            </div>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque', sans-serif",
                fontSize: "2.4rem",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1.15,
                marginBottom: "0.75rem",
                letterSpacing: "-0.02em",
              }}
            >
              วิเคราะห์ <span style={{ color: "#2563eb" }}>รอยโรคผิวหนัง</span>{" "}
              ของคุณ
            </h2>
            <p
              style={{
                color: "#64748b",
                fontSize: "1rem",
                maxWidth: 480,
                margin: "0 auto",
                lineHeight: 1.7,
              }}
            >
              อัปโหลดภาพที่ชัดเจน แล้ว AI ของเราจะวิเคราะห์และจัดประเภทให้ทันที
              ครอบคลุม 6 โรคผิวหนัง
            </p>
          </div>

          <div
            className="analyser-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2.5rem",
              alignItems: "start",
            }}
          >
            {/* LEFT — Upload + Result */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: 24,
                  boxShadow: "0 4px 40px rgba(37,99,235,0.09)",
                  overflow: "hidden",
                  border: "1px solid #e8f0fe",
                }}
              >
                <div
                  style={{
                    background: "linear-gradient(135deg,#2563eb,#0ea5e9)",
                    padding: "1.5rem 2rem",
                    color: "white",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontSize: "1.15rem",
                      fontWeight: 700,
                      marginBottom: "0.25rem",
                    }}
                  >
                    วิเคราะห์ผิวของคุณ
                  </div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                    ลากรูปภาพมาด้านล่างเพื่อเริ่มต้น
                  </div>
                </div>
                <div
                  style={{
                    padding: "2rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.25rem",
                  }}
                >
                  {!preview && (
                    <div
                      className={`upload-zone${dragging ? " dragging" : ""}`}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        const f = e.dataTransfer.files[0];
                        if (f) loadFile(f);
                      }}
                      onClick={() => inputRef.current?.click()}
                    >
                      <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) loadFile(e.target.files[0]);
                        }}
                      />
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          background: "linear-gradient(135deg,#2563eb,#0ea5e9)",
                          borderRadius: "50%",
                          margin: "0 auto 1rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "1.5rem",
                          boxShadow: "0 6px 20px rgba(37,99,235,0.35)",
                        }}
                      >
                        ↑
                      </div>
                      <div
                        style={{
                          fontSize: "0.9rem",
                          color: "#64748b",
                          lineHeight: 1.8,
                        }}
                      >
                        <strong style={{ color: "#2563eb", fontWeight: 600 }}>
                          คลิกหรือวาง
                        </strong>{" "}
                        รูปภาพที่นี่
                        <br />
                        <span style={{ fontSize: "0.78rem" }}>
                          รองรับ JPG, PNG, WEBP
                        </span>
                      </div>
                    </div>
                  )}
                  {preview && (
                    <div
                      style={{
                        position: "relative",
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <img
                        src={preview}
                        alt="Preview"
                        style={{
                          width: "100%",
                          maxHeight: 280,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <button
                        onClick={clearImage}
                        style={{
                          position: "absolute",
                          top: "0.75rem",
                          right: "0.75rem",
                          background: "rgba(255,255,255,0.92)",
                          color: "#ef4444",
                          border: "1px solid #fecaca",
                          borderRadius: 8,
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "0.35rem 0.8rem",
                          cursor: "pointer",
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        ✕ ลบ
                      </button>
                    </div>
                  )}
                  {preview && (
                    <button
                      className="analyse-btn"
                      onClick={runPrediction}
                      disabled={loading}
                    >
                      {loading ? "กำลังวิเคราะห์..." : "วิเคราะห์รูปภาพ →"}
                    </button>
                  )}
                  {loading && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.75rem",
                        fontSize: "0.82rem",
                        color: "#64748b",
                      }}
                    >
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          border: "2.5px solid #bfdbfe",
                          borderTopColor: "#2563eb",
                          borderRadius: "50%",
                          animation: "spin 0.7s linear infinite",
                          flexShrink: 0,
                        }}
                      />
                      กำลังวิเคราะห์ด้วยโมเดล AI...
                    </div>
                  )}
                  {error && (
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#ef4444",
                        background: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: 10,
                        padding: "0.85rem 1.1rem",
                      }}
                    >
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Result card appears below upload card */}
              {result && (
                <ResultCard result={result} sortedProbs={sortedProbs} />
              )}

              {/* Disclaimer */}
              <div
                style={{
                  background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
                  border: "1px solid #fde68a",
                  borderRadius: 16,
                  padding: "1.1rem 1.4rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.85rem",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  ⚠️
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "'Bricolage Grotesque', sans-serif",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      color: "#92400e",
                      marginBottom: "0.2rem",
                    }}
                  >
                    ข้อจำกัดความรับผิดชอบทางการแพทย์
                  </div>
                  <div
                    style={{
                      fontSize: "0.74rem",
                      color: "#78716c",
                      lineHeight: 1.6,
                    }}
                  >
                    ใช้เพื่อการวิจัยและการศึกษาเท่านั้น
                    ควรปรึกษาแพทย์ผิวหนังที่ได้รับใบอนุญาตเสมอสำหรับคำแนะนำทางการแพทย์
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — features + conditions */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: 20,
                  padding: "1.5rem 2rem",
                  boxShadow: "0 2px 16px rgba(37,99,235,0.07)",
                  border: "1px solid #e8f0fe",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bricolage Grotesque', sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "#0f172a",
                    marginBottom: "1rem",
                  }}
                >
                  โรคที่สามารถตรวจจับได้
                </div>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}
                >
                  {conditions.map((c) => (
                    <span
                      key={c}
                      style={{
                        background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                        border: "1px solid #bfdbfe",
                        borderRadius: 50,
                        padding: "0.4rem 1rem",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        color: "#2563eb",
                      }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              {features.map((f) => (
                <div key={f.title} className="feature-card">
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: "linear-gradient(135deg,#eff6ff,#dbeafe)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.15rem",
                      flexShrink: 0,
                    }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Bricolage Grotesque', sans-serif",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        marginBottom: "0.25rem",
                        color: "#0f172a",
                      }}
                    >
                      {f.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.76rem",
                        color: "#64748b",
                        lineHeight: 1.6,
                      }}
                    >
                      {f.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
