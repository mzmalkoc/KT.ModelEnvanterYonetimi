"""A/B karsilastirma testleri — GERCEK Turkce karakterlerle."""
import requests
import sys

sys.stdout.reconfigure(encoding="utf-8")

URL = "http://127.0.0.1:8000/api/check-similarity"

TESTS = [
    {
        "name": "TEST 1 - Cok kisa sorgu",
        "old_score": 0.42,
        "expected": "Card Fraud Detection Model",
        "payload": {"name": "fraud", "purpose": "", "language": "auto"},
    },
    {
        "name": "TEST 2 - Tek kelime jargon",
        "old_score": 0.40,
        "expected": "Sanctions Screening / AML",
        "payload": {"name": "OFAC", "purpose": "", "language": "auto"},
    },
    {
        "name": "TEST 3 - Turkce jargon (KKB)",
        "old_score": 0.50,
        "expected": "Credit Scoring / Application Scorecard",
        "payload": {"name": "KKB raporu", "purpose": "risk skorlama yapan model", "language": "auto"},
    },
    {
        "name": "TEST 4 - Cross-lingual (EN sorgu)",
        "old_score": 0.74,
        "expected": "Credit Scoring Model",
        "payload": {"name": "Customer risk scoring", "purpose": "Individual customer loan application risk assessment", "language": "auto"},
    },
    {
        "name": "TEST 5 - Uzun TR (DOGRU diakritikle)",
        "old_score": 0.756,
        "expected": "Credit Scoring Model",
        "payload": {"name": "Müşteri risk skoru", "purpose": "Bireysel müşteri kredi başvurusu risk değerlendirmesi", "language": "auto"},
    },
    {
        "name": "TEST 6 - PCI-DSS jargonu",
        "old_score": 0.50,
        "expected": "Card Fraud Detection",
        "payload": {"name": "PCI-DSS uyumlu kart fraud", "purpose": "", "language": "auto"},
    },
    {
        "name": "TEST 7 - Negatif kontrol",
        "old_score": None,
        "expected": "Hicbiri (skor < 0.55)",
        "payload": {"name": "asdfgh", "purpose": "qwerty zxcvb random text", "language": "auto"},
    },
    {
        "name": "TEST 8 - Bonus: 'churn' tek kelime",
        "old_score": None,
        "expected": "Customer Churn Prediction",
        "payload": {"name": "churn", "purpose": "", "language": "auto"},
    },
    {
        "name": "TEST 9 - Bonus: 'müşteri kaybı tahmini'",
        "old_score": None,
        "expected": "Customer Churn Prediction",
        "payload": {"name": "müşteri kaybı tahmini", "purpose": "", "language": "auto"},
    },
]

print("=" * 100)
print("A/B KARSILASTIRMA — Yeni Sistem (Multi-View + BM25 + Cross-Encoder, dogru formul)")
print("=" * 100)

improved = 0
worsened = 0
total_delta_pct = 0
counted = 0

for t in TESTS:
    print(f"\n{'-' * 100}")
    print(f"{t['name']}")
    print(f"  Sorgu: {t['payload']}")
    print(f"  Beklenen: {t['expected']}")
    if t['old_score']:
        print(f"  ESKI SISTEM: {t['old_score']:.3f}")

    try:
        r = requests.post(URL, json=t['payload'], timeout=30)
        d = r.json()
        if r.status_code != 200:
            print(f"  HATA: {r.status_code} {d}")
            continue

        rec = d.get('recommendation', '?')
        det_lang = d.get('input', {}).get('detected_language', '?')
        print(f"  Tespit dil: {det_lang} | Recommendation: {rec}")
        print(f"  TOP-3:")
        for i, m in enumerate(d['matches'][:3], 1):
            name = m['model']['name_tr']
            final = m['similarity_score']
            sem = m.get('semantic_score', 0)
            bm25 = m.get('bm25_score', 0)
            rerank = m.get('rerank_score', 0)
            view = m.get('matched_view', '?')
            lang = m['matched_language']
            risk = m['risk_level']
            print(f"    {i}. {name:35s}  FINAL={final:.3f}  sem={sem:.3f}  bm25={bm25:.3f}  rerank={rerank:.3f}  view={view:8s} ({risk})")

        if t['old_score'] and d['matches']:
            new = d['matches'][0]['similarity_score']
            delta = new - t['old_score']
            pct = (delta / t['old_score']) * 100
            sign = "+" if delta > 0 else ""
            arrow = ">>>" if delta > 0 else "!!!"
            print(f"  {arrow} FARK: {t['old_score']:.3f} -> {new:.3f}  (delta {sign}{delta:.3f}, {sign}{pct:.1f}%)")
            counted += 1
            total_delta_pct += pct
            if delta > 0:
                improved += 1
            else:
                worsened += 1
    except Exception as e:
        print(f"  HATA: {e}")

print("\n" + "=" * 100)
print(f"OZET: {improved} iyilesme / {worsened} gerileme / {counted} olculen test")
if counted:
    print(f"  Ortalama degisim: {total_delta_pct/counted:+.1f}%")
print("=" * 100)
