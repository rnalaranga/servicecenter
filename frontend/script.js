const fs = require('fs');

const css = `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Playfair+Display:ital@0;1&family=Great+Vibes&display=swap');

        @media screen {
          .print-only { display: none !important; }
        }

        @media print {
          @page { margin: 0; size: A4; }
          body * { visibility: hidden; }
          .no-print { display: none !important; }
          .print-only, .print-only * { visibility: visible; }
          .print-only {
            position: absolute; left: 0</top: 0; width: 100%;
            background: #fff; font-family: 'Montserrat', sans-serif; color: #000;
          }
          .print-header {
            background: #000; color: #fff; padding: 40px 50px;
            display: flex; justify-content: space-between; align-items: center;
            -webkit-print-color-adjust: exact; print-color-adjust: exact;
          }
          .print-header-left { font-family: 'Playfair Display', serif; font-size: 44px; letter-spacing: 2px; }
          .print-header-right { text-align: right; }
          .print-logo {
            font-size: 16px; font-weight: 700; letter-spacing: 4px;
            text-transform: uppercase; margin-bottom: 8px;
          }
          .print-address { font-size: 12px; color: #ccc; letter-spacing: 1px; }
          .print-content { padding: 50px; position: relative; min-height: 800px; }
          .print-info {
            display: flex; justify-content: space-between; margin-bottom: 60px;
            font-size: 13px; line-height: 1.8;
          }
          .print-info-left { flex: 1; }
          .print-info-right { text-align: right; }
          .print-label { font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
          .print-value { color: #333; font-weight: 500; }
          .print-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
          .print-table th {
            border-top: 2px solid #000; border-bottom: 1px solid #000;
            padding: 12px 0; font-weight: 700; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;
          }
          .print-table td { padding: 30px 0; border-bottom: 1px solid #eee; }
          .print-totals {
            bckground: #fff; border-top: 1px solid #000;
            padding-top: 20px; margin-bottom: 60px;
          }
          .print-totals-row {
            display: flex; justify-content: space-between;
            font-weight: 700; font-size: 14px; letter-spacing: 1px;
            padding-bottom: 20px; margin-bottom: 24px; border-bottom: 1px solid #000;
          }
          .print-totals-final {
            display: flex; justify-content: flex-end; gap: 40px;
            font-size: 14px; align-items: flex-start;
          }
          .print-totals-final-value { text-align: right; font-size: 18px; font-weight: 500; letter-spacing: 1px; }
          .print-conditions-title { font-weight: 700; font-size: 13px; letter-spacing: 1px; margin-bottom: 16px; text-transform: uppercase; }
   