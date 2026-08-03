/* ============================================================
   PDF.JS — PROFESSIONAL DOCUMENT GENERATOR v15.0
   Exact match: BC_DG_BC_006_2026-7.pdf reference
   + Arabic font support (Amiri TTF auto-loaded from CDN)
   ============================================================ */
(function (global) {
  'use strict';

  if (!global.jspdf || !global.jspdf.jsPDF) {
    console.error('PDFGen: jsPDF not loaded.');
    return;
  }
  const { jsPDF } = global.jspdf;

  /* ── Arabic font cache (loaded once from CDN) ────────────── */
  let _arFontB64  = null;   /* base64 string of TTF data    */
  let _arFontLoad = null;   /* promise for in-flight fetch  */
  const AR_FONT_URL = 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf';
  const AR_FONT_NAME = 'Amiri';
  const AR_RE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  /* ── Colours ────────────────────────────────────────────── */
  const C = {
    PRIMARY:      [0,  96, 120],
    PRIMARY_DARK: [0,  74,  92],
    WHITE:        [255,255,255],
    BLACK:        [0,   0,   0],
    LIGHT:        [217,239,243],
    RED:          [220, 38,  38],
    GRAY_TXT:     [100,116,139],
    LINE:         [203,213,225],
    BG_INFO:      [248,250,252],
  };

  /* ── Page geometry ──────────────────────────────────────── */
  const PW = 210, PH = 297;
  const ML = 8,  MR = 8;
  const CW = PW - ML - MR;  /* 194 mm */
  const MT = 8;

  const PDFGen = {

    _notify(msg, type) {
      if (typeof Utils !== 'undefined' && Utils.notify) Utils.notify(msg, type||'info');
      else alert(msg);
    },

    /* ── Pass text raw ──────────────────────────────────────── */
    _t(v) {
      if (v === null || v === undefined) return '';
      return String(v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
    },

    /* ── Arabic detection ──────────────────────────────────── */
    _hasAr(text) { return AR_RE.test(String(text||'')); },

    /* ── Load Amiri Arabic font (once, cached) ────────────── */
    async _ensureArabicFont() {
      if (_arFontB64) return true;
      if (_arFontLoad) return _arFontLoad;
      _arFontLoad = (async () => {
        try {
          const resp = await fetch(AR_FONT_URL);
          if (!resp.ok) throw new Error(resp.status);
          const buf  = await resp.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let bin = '';
          /* chunk the btoa to avoid call-stack overflow on large arrays */
          const CHUNK = 8192;
          for (let i = 0; i < bytes.length; i += CHUNK) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
          }
          _arFontB64 = btoa(bin);
          console.log('PDFGen: Amiri Arabic font loaded (' + Math.round(buf.byteLength/1024) + ' KB)');
          return true;
        } catch(e) {
          console.warn('PDFGen: could not load Arabic font:', e);
          _arFontB64 = null;
          return false;
        }
      })();
      return _arFontLoad;
    },

    /* Register the cached font on a jsPDF doc instance */
    _registerAr(doc) {
      if (!_arFontB64) return false;
      try {
        doc.addFileToVFS('Amiri-Regular.ttf', _arFontB64);
        doc.addFont('Amiri-Regular.ttf', AR_FONT_NAME, 'normal');
        return true;
      } catch(e) { return false; }
    },

    /* Smart text — auto-switches to Amiri for Arabic content */
    _text(doc, text, x, y, opts) {
      const s = this._t(text);
      if (this._hasAr(s) && _arFontB64) {
        const prev = doc.getFont();
        doc.setFont(AR_FONT_NAME, 'normal');
        doc.text(s, x, y, opts);
        doc.setFont(prev.fontName, prev.fontStyle);
      } else {
        doc.text(s, x, y, opts);
      }
    },

    /* ── Date ───────────────────────────────────────────────  */
    _fmtDate(d) {
      if (!d) return '';
      const dt = new Date(d);
      if (isNaN(dt)) return String(d);
      return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
    },
    _fmtDateTime(d) {
      if (!d) return '';
      const dt = new Date(d);
      if (isNaN(dt)) return String(d);
      return `${this._fmtDate(d)} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
    },

    /* ── Numbers ────────────────────────────────────────────  */
    _numFmt(n, dec) {
      const num = Number(n)||0;
      const fixed = num.toFixed(dec!==undefined?dec:2);
      const parts = fixed.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,' ');
      return dec===0 ? parts[0] : parts[0]+','+parts[1];
    },
    _fmtMoney(v) { return this._numFmt(v,2)+'\u00a0DA'; },
    _fmtNum(v)   { return this._numFmt(v,0); },

    /* ── Settings ───────────────────────────────────────────  */
    _settings() {
      return (typeof DB!=='undefined'&&DB.getSettings)?DB.getSettings():{};
    },

    /* ── Theme colour from settings ─────────────────────────  */
    _applyTheme(s) {
      s = s||this._settings();
      const hex = String(s.themeColor||'').trim();
      const h = hex.startsWith('#')?hex:'#'+hex;
      if (!/^#[0-9a-fA-F]{6}$/.test(h)) return;
      const r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);
      const cl=n=>Math.max(0,Math.min(255,Math.round(n)));
      const mx=(a,t,p)=>cl(a*(1-p)+t*p);
      C.PRIMARY      = [r,g,b];
      C.PRIMARY_DARK = [mx(r,0,.25),mx(g,0,.25),mx(b,0,.25)];
      C.LIGHT        = [mx(r,255,.85),mx(g,255,.85),mx(b,255,.85)];
    },

    /* ── New compressed doc (with Arabic font if available) ── */
    _newDoc() {
      this._applyTheme();
      const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true,putOnlyUsedFonts:true});
      this._registerAr(doc);
      return doc;
    },
    _save(doc, fn) { doc.save(fn); this._notify('PDF généré','success'); },

    /* ── Drawing ────────────────────────────────────────────  */
    _fill(doc,rgb)   { doc.setFillColor(rgb[0],rgb[1],rgb[2]); },
    _stroke(doc,rgb) { doc.setDrawColor(rgb[0],rgb[1],rgb[2]); },
    _tc(doc,rgb)     { doc.setTextColor(rgb[0],rgb[1],rgb[2]); },
    _rect(doc,x,y,w,h,fill,stroke) {
      if(fill)  { this._fill(doc,fill);   doc.rect(x,y,w,h,'F'); }
      if(stroke){ this._stroke(doc,stroke);doc.rect(x,y,w,h,'S'); }
    },
    _hline(doc,y,lw,color) {
      doc.setLineWidth(lw||0.3);
      this._stroke(doc,color||C.LINE);
      doc.line(ML,y,ML+CW,y);
      doc.setLineWidth(0.2);
    },

    /* ══════════════════════════════════════════════════════════
       CROSS-HATCH MESH — anti-tamper pattern in blank area
       Exactly as in the reference BC PDF
    ══════════════════════════════════════════════════════════ */
    _drawMesh(doc, x, top, w, bottom) {
      const pad = 2;
      const left  = x+pad, right = x+w-pad;
      const t = top+pad,   b = bottom-pad;
      if (right<=left||b<=t) return;

      /* subtle fill */
      doc.setFillColor(250,250,250);
      doc.rect(left,t,right-left,b-t,'F');

      const spacing = 0.6;
      doc.setDrawColor(160,160,160);
      doc.setLineWidth(0.12);

      /* Family 1: slope -1 (x - y = c) */
      const cMin = left-b, cMax = right-t;
      for(let c=cMin;c<=cMax;c+=spacing){
        const pts=[];
        const yL=left-c;   if(yL>=t&&yL<=b) pts.push([left,yL]);
        const yR=right-c;  if(yR>=t&&yR<=b) pts.push([right,yR]);
        const xT=c+t;      if(xT>=left&&xT<=right) pts.push([xT,t]);
        const xB=c+b;      if(xB>=left&&xB<=right) pts.push([xB,b]);
        if(pts.length>=2) doc.line(pts[0][0],pts[0][1],pts[1][0],pts[1][1]);
      }

      /* Family 2: slope +1 (x + y = c) */
      const cMin2=left+t, cMax2=right+b;
      for(let c=cMin2;c<=cMax2;c+=spacing){
        const pts=[];
        const yL=c-left;   if(yL>=t&&yL<=b) pts.push([left,yL]);
        const yR=c-right;  if(yR>=t&&yR<=b) pts.push([right,yR]);
        const xT=c-t;      if(xT>=left&&xT<=right) pts.push([xT,t]);
        const xB=c-b;      if(xB>=left&&xB<=right) pts.push([xB,b]);
        if(pts.length>=2) doc.line(pts[0][0],pts[0][1],pts[1][0],pts[1][1]);
      }
      doc.setLineWidth(0.2);
    },

    /* ══════════════════════════════════════════════════════════
       COMPANY HEADER (exact reference style)
    ══════════════════════════════════════════════════════════ */
    _drawCompanyHeader(doc, s, startY) {
      let y = startY||MT;
      const SLOT_W=40, SLOT_H=20;

      const drawLogo = (src, sx) => {
        if(!src) return;
        try {
          const fmt = src.startsWith('data:image/png')?'PNG':src.startsWith('data:image/gif')?'GIF':'JPEG';
          const props = doc.getImageProperties?doc.getImageProperties(src):null;
          const ar = (props&&props.width&&props.height)?props.width/props.height:1;
          let w=SLOT_W, h=w/ar;
          if(h>SLOT_H){h=SLOT_H;w=h*ar;}
          if(w>SLOT_W){w=SLOT_W;h=w/ar;}
          doc.addImage(src,fmt,sx+(SLOT_W-w)/2,y+(SLOT_H-h)/2,w,h,undefined,'FAST');
        } catch(e) {}
      };
      drawLogo(s.logoLeft||s.leftLogo,   ML);
      drawLogo(s.logoRight||s.rightLogo, PW-MR-SLOT_W);

      /* Company name — may be Arabic */
      const cName = this._t(s.companyName||'/');
      if (this._hasAr(cName) && _arFontB64) doc.setFont(AR_FONT_NAME,'normal');
      else doc.setFont('helvetica','bold');
      doc.setFontSize(12);
      this._tc(doc,C.PRIMARY);
      doc.text(cName, PW/2, y+5.2, {align:'center'});
      doc.setFont('helvetica','normal');

      doc.setFontSize(7.3);
      this._tc(doc,C.BLACK);
      const infoLines = [
        s.capital||'',
        [s.nif&&`NIF : ${s.nif}`, s.rc&&`RC : ${s.rc}`].filter(Boolean).join('  '),
        [s.nis&&`NIS : ${s.nis}`, s.ai&&`AI : ${s.ai}`].filter(Boolean).join('  '),
        [s.address&&this._t(s.address), s.phone&&`Tel : ${s.phone}`].filter(Boolean).join('  '),
        s.email?`E-mail : ${s.email}`:'',
      ].filter(Boolean);

      let ly=y+9;
      infoLines.forEach(line => {
        const lt = this._t(line);
        if (this._hasAr(lt) && _arFontB64) doc.setFont(AR_FONT_NAME,'normal');
        else doc.setFont('helvetica','normal');
        const parts = doc.splitTextToSize(lt, CW);
        parts.forEach(p=>{ doc.text(p,PW/2,ly,{align:'center'}); ly+=3; });
      });
      doc.setFont('helvetica','normal');
      ly = Math.max(ly, y+SLOT_H+2);
      this._hline(doc,ly+0.8,0.4);
      return ly+3;
    },

    /* ══════════════════════════════════════════════════════════
       TITLE BANNER — reference style (no ref# in banner,
       ref is shown in info strip like the reference)
    ══════════════════════════════════════════════════════════ */
    _drawBanner(doc, text, y) {
      const h=8;
      this._rect(doc,ML,y,CW,h,C.PRIMARY);
      doc.setFont('helvetica','bold');
      doc.setFontSize(13);
      this._tc(doc,C.WHITE);
      doc.text(text,PW/2,y+5.6,{align:'center'});
      return y+h+3;
    },

    /* ══════════════════════════════════════════════════════════
       INFO STRIP — key:value pairs on one light-bg line
    ══════════════════════════════════════════════════════════ */
    _drawInfoStrip(doc, items, y) {
      const h=6;
      this._rect(doc,ML,y,CW,h,C.BG_INFO,C.LINE);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7.5);
      this._tc(doc,C.BLACK);
      const cw=CW/items.length;
      items.forEach((it,i)=>{
        const x=ML+i*cw+2;
        doc.text(`${this._t(it.label)} : ${this._t(String(it.value||'/'))}`  ,x,y+4.2);
      });
      return y+h+1;
    },

    /* ══════════════════════════════════════════════════════════
       ENTITY INFO BOX (reference style: title centered on LIGHT bg)
    ══════════════════════════════════════════════════════════ */
    _drawEntityBox(doc, title, lines, x, y, w, h) {
      this._rect(doc,x,y,w,h,C.BG_INFO,C.LINE);
      this._rect(doc,x,y,w,6.5,C.LIGHT,C.LINE);
      doc.setFont('helvetica','bold');
      doc.setFontSize(8.5);
      this._tc(doc,C.PRIMARY_DARK);
      doc.text(title,x+w/2,y+4.5,{align:'center'});
      doc.setFontSize(8);
      this._tc(doc,C.BLACK);
      let cy=y+11;
      lines.filter(l=>l!==null&&l!==undefined&&String(l).trim()).forEach(ln=>{
        const txt = String(ln);
        /* Switch to Amiri for Arabic, back to helvetica for Latin */
        if (this._hasAr(txt) && _arFontB64) {
          doc.setFont(AR_FONT_NAME,'normal');
        } else {
          doc.setFont('helvetica','normal');
        }
        const parts=doc.splitTextToSize(txt, w-6);
        parts.slice(0,6).forEach(p=>{doc.text(p,x+3,cy);cy+=3.8;});
      });
      doc.setFont('helvetica','normal');
    },

    /* ══════════════════════════════════════════════════════════
       SIGNATURE BLOCK — reference style (plain boxes)
    ══════════════════════════════════════════════════════════ */
    _drawSigBlock(doc, cols, y, blockH) {
      blockH=blockH||40;
      const cw=CW/cols.length;
      cols.forEach((col,i)=>{
        const x=ML+i*cw;
        this._rect(doc,x,y,cw,blockH,null,C.LINE);
        doc.setFont('helvetica','bold');
        doc.setFontSize(9);
        this._tc(doc,C.BLACK);
        doc.text(col.label,x+cw/2,y+6,{align:'center'});
        if(col.sub){
          if(this._hasAr(col.sub)&&_arFontB64) doc.setFont(AR_FONT_NAME,'normal');
          else doc.setFont('helvetica','italic');
          doc.setFontSize(7.5);
          this._tc(doc,C.GRAY_TXT);
          this._text(doc,col.sub,x+cw/2,y+11,{align:'center'});
        }
        if(col.value){
          if(this._hasAr(col.value)&&_arFontB64) doc.setFont(AR_FONT_NAME,'normal');
          else doc.setFont('helvetica','normal');
          doc.setFontSize(8);
          this._tc(doc,C.BLACK);
          this._text(doc,col.value,x+cw/2,y+16,{align:'center'});
        }
        /* dotted signature line */
        this._fill(doc,C.GRAY_TXT);
        const dotY=y+blockH-10;
        let lx=x+5;
        while(lx<x+cw-5){doc.circle(lx,dotY,0.35,'F');lx+=2.2;}
      });
      return y+blockH+4;
    },

    /* ══════════════════════════════════════════════════════════
       PAGE FOOTER
    ══════════════════════════════════════════════════════════ */
    _drawFooter(doc, pg, total) {
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      this._tc(doc,C.GRAY_TXT);
      doc.text(`Page ${pg} sur ${total}`,PW/2,PH-6,{align:'center'});
      doc.text(`Genere le : ${this._fmtDateTime(new Date().toISOString())}`,ML,PH-6);
    },

    _amountWords(n) {
      if(typeof Utils!=='undefined'&&Utils.numberToWordsFR)
        return Utils.numberToWordsFR(Math.floor(Number(n)||0));
      return '';
    },

    /* ══════════════════════════════════════════════════════════
       BUILD TABLE with MESH — shared by BR and BL
       cols = [{label,width,halign}]
       bodyRows = array of string arrays
       totalsData = {totalHT, timbre, totalTTC, extraFees?}
       Returns finalY
    ══════════════════════════════════════════════════════════ */
    _buildTable(doc, startY, cols, bodyRows, totalsData) {
      /* Column widths must sum to CW */
      const colStyles = {};
      cols.forEach((c,i)=>{
        colStyles[i]={halign:c.halign||'center', cellWidth:c.width};
        if(i===1) colStyles[i].cellPadding={top:2.5,right:2,bottom:2,left:2};
      });

      /* Build totals rows to append in body */
      /* Each total row: [colSpan:N-2 mesh cell, label cell, value cell] */
      const NC = cols.length;          /* number of columns, typically 6 */
      const SPAN = NC-2;               /* span for blank mesh area */

      const mkTotRow = (label, value, isTTC) => {
        const spanCell = {
          content: '', colSpan: SPAN, _meshBlock: true,
          styles: { fillColor: C.WHITE, cellPadding: 0, lineWidth: 0.15, lineColor: C.LINE }
        };
        const lblCell = {
          content: label,
          styles: {
            halign:'center', fontStyle:'bold',
            fillColor: isTTC ? C.PRIMARY : C.LIGHT,
            textColor: isTTC ? C.WHITE   : C.BLACK,
            cellPadding:2, fontSize:9,
          }
        };
        const valCell = {
          content: value,
          styles: {
            halign:'center', fontStyle:'bold',
            fillColor: isTTC ? C.PRIMARY : [255,255,255],
            textColor: isTTC ? C.WHITE   : C.BLACK,
            cellPadding:2, fontSize:9,
          }
        };
        return [spanCell, lblCell, valCell];
      };

      const totRows = [];
      if (totalsData.extraFees) totRows.push(mkTotRow('Frais suppl.',   this._fmtMoney(totalsData.extraFees), false));
      totRows.push(mkTotRow('Total HT',   this._fmtMoney(totalsData.totalHT||0),  false));
      if (totalsData.tvaAmount) totRows.push(mkTotRow(`Taxes (TVA ${totalsData.tvaRate||19}%)`, this._fmtMoney(totalsData.tvaAmount||0), false));
      if (totalsData.timbre) totRows.push(mkTotRow('Timbre Fiscal', this._fmtMoney(totalsData.timbre||0), false));
      totRows.push(mkTotRow('TOTAL TTC',  this._fmtMoney(totalsData.totalTTC||0), true));

      /* Tag first/last for mesh drawing */
      if (totRows.length) {
        totRows[0][0]._meshStart = true;
        totRows[totRows.length-1][0]._meshEnd = true;
      }

      /* Mesh tracking */
      const mesh = {x:null, w:null, top:null, bottom:null, drawn:false};

      const finalY = this._autoTable(doc, {
        startY, margin:{left:ML,right:MR}, tableWidth:CW, theme:'grid',
        head: [cols.map(c=>c.label)],
        body: [...bodyRows, ...totRows],
        headStyles: {
          fillColor:C.PRIMARY, textColor:C.WHITE, fontStyle:'bold',
          halign:'center', valign:'middle', fontSize:8, cellPadding:2, lineWidth:0,
        },
        bodyStyles: { fontSize:7.6, cellPadding:1.6, valign:'middle', lineColor:C.LINE, lineWidth:0.15 },
        alternateRowStyles: { fillColor:[245,249,251] },
        columnStyles: colStyles,
        didDrawCell: (data) => {
          if (data.section!=='body') return;
          if (data.column.index!==0) return;
          const raw = data.cell&&data.cell.raw ? data.cell.raw : null;
          if (!raw||!raw._meshBlock) return;
          if (mesh.drawn) return;
          if (mesh.x===null) {
            mesh.x=data.cell.x; mesh.w=data.cell.width;
            mesh.top=data.cell.y; mesh.bottom=data.cell.y+data.cell.height;
          } else {
            mesh.top    = Math.min(mesh.top,    data.cell.y);
            mesh.bottom = Math.max(mesh.bottom, data.cell.y+data.cell.height);
          }
          if (raw._meshEnd&&!mesh.drawn&&mesh.x!==null) {
            this._drawMesh(doc, mesh.x, mesh.top, mesh.w, mesh.bottom);
            mesh.drawn=true;
          }
        }
      });
      return finalY;
    },

    /* Wrapper for autoTable */
    _autoTable(doc, opts) {
      if (typeof doc.autoTable!=='function') throw new Error('autoTable not loaded');
      doc.autoTable(opts);
      return doc.lastAutoTable.finalY;
    },

    /* ══════════════════════════════════════════════════════════
       ROUTER (async — waits for Arabic font before generating)
    ══════════════════════════════════════════════════════════ */
    async exportBR(id)       { try{ await this._ensureArabicFont(); this._exportBR(id);       }catch(e){console.error(e);this._notify('Erreur BR: '+e.message,'error');} },
    async exportBL(id)       { try{ await this._ensureArabicFont(); this._exportBL(id);       }catch(e){console.error(e);this._notify('Erreur BL: '+e.message,'error');} },
    async exportDecharge(id) { try{ await this._ensureArabicFont(); this._exportDecharge(id); }catch(e){console.error(e);this._notify('Erreur Decharge: '+e.message,'error');} },

    /* ══════════════════════════════════════════════════════════
       BR — BON DE RÉCEPTION
    ══════════════════════════════════════════════════════════ */
    _exportBR(id) {
      const br  = DB.getById('brs', id);
      if(!br) { this._notify('BR introuvable','error'); return; }
      const sup = DB.getById('suppliers', br.supplierId)||{};
      const s   = this._settings();
      const doc = this._newDoc();

      /* ── Header / Banner / Strip ── */
      let y = this._drawCompanyHeader(doc, s, MT);
      y = this._drawBanner(doc, 'BON DE RÉCEPTION', y);
      y = this._drawInfoStrip(doc, [
        {label:'Date',       value:this._fmtDate(br.date)},
        {label:'Référence',  value:this._t(br.ref||'/')},
        {label:'Année',      value:br.year||new Date().getFullYear()},
      ], y);
      y += 4;

      /* ── Entity cards ── */
      const gap=4, cw2=(CW-gap)/2, boxH=42;
      const supLines = [
        this._t(sup.name||'/'),
        `NIF : ${sup.nif||'-'}`,
        `NIS : ${sup.nis||'-'}`,
        `RC  : ${sup.rc||'-'}`,
        `Adresse : ${this._t(sup.address||'-')}`,
        `Tel : ${sup.phone||'-'}`,
      ];
      this._drawEntityBox(doc,'Fournisseur', supLines, ML, y, cw2, boxH);
      this._drawEntityBox(doc,'Réception / Contrôle',[
        `Réceptionné par : ${this._t(br.receivedBy||'......................')}`,
        `Contrôlé par    : ${this._t(br.controlledBy||'......................')}`,
        '',
        `Date réception  : ${this._fmtDate(br.date)}`,
      ], ML+cw2+gap, y, cw2, boxH);
      y += boxH+4;

      /* ── 6-column table with mesh ── */
      /* w0+w1+w2+w3+w4+w5 must = CW=194 */
      /* 12+95+14+18+28+27 = 194 ✓ */
      /* Exact reference BC widths: 12+75+15+18+34+40 = 194 = CW ✓ */
      const COLS = [
        {label:'N°',                                            width:12, halign:'center'},
        {label:'DÉSIGNATION DES FOURNITURES / SERVICES',        width:75, halign:'left'},
        {label:'UNITÉ',                                         width:15, halign:'center'},
        {label:'QTÉ',                                           width:18, halign:'center'},
        {label:'P.U. HT',                                       width:34, halign:'center'},
        {label:'TOTAL HT',                                      width:40, halign:'center'},
      ];

      const bodyRows6 = (br.lines||[]).map((l,i)=>{
        const qty=Number(l.qty)||0, pu=Number(l.price)||0, disc=Number(l.disc)||0;
        const tot=qty*pu*(1-disc/100);
        return [
          String(i+1).padStart(2,'0'),
          this._t(l.designation||''),
          this._t(l.unit||'U'),
          this._fmtNum(qty),
          this._fmtMoney(pu)+(disc?` (-${disc}%)`:''),
          this._fmtMoney(tot),
        ];
      });
      if(!bodyRows6.length) bodyRows6.push(['01','','U','','',this._fmtMoney(0)]);

      const tEndY = this._buildTable(doc, y, COLS, bodyRows6, {
        totalHT:  br.totalHT||0,
        tvaAmount:br.tvaAmount||0,
        tvaRate:  br.tvaRate||0,
        timbre:   br.timbreAmount||0,
        totalTTC: br.totalTTC||0,
        extraFees:br.extraFees||0,
      });
      y = tEndY + 4;

      /* ── Amount in words ── */
      const wd = this._amountWords(br.totalTTC);
      if(wd){
        doc.setFont('helvetica','italic'); doc.setFontSize(8); this._tc(doc,C.GRAY_TXT);
        const wl=doc.splitTextToSize(`Arretee a : ${wd} dinars algeriens`, CW);
        doc.text(wl,ML,y); y+=wl.length*4+3;
      }

      /* ── Attestation ── */
      y+=3;
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); this._tc(doc,C.BLACK);
      const att='Nous attestons que les fournitures receptionnees sont conformes a la commande qualitativement et quantitativement.';
      const attL=doc.splitTextToSize(att, CW);
      doc.text(attL,ML,y); y+=attL.length*4.5+4;

      if(br.notes){
        doc.setFont('helvetica','normal'); doc.setFontSize(8); this._tc(doc,C.GRAY_TXT);
        const nl=doc.splitTextToSize(`Observations : ${this._t(br.notes)}`, CW);
        doc.text(nl,ML,y); y+=nl.length*4+3;
      }

      /* ── 3 Signature blocks ── */
      this._drawSigBlock(doc,[
        {label:'Le Fournisseur',   sub:this._t(sup.name||'')},
        {label:'Réceptionné par',  value:this._t(br.receivedBy||''),  sub:'Signature & Cachet'},
        {label:'Contrôlé par',     value:this._t(br.controlledBy||''), sub:'Signature & Cachet'},
      ], Math.max(y, PH-62), 44);

      this._drawFooter(doc,1,1);
      this._save(doc,`BR_${this._t(br.ref||'BROUILLON').replace(/\//g,'_')}.pdf`);
    },

    /* ══════════════════════════════════════════════════════════
       BL — BON DE LIVRAISON
    ══════════════════════════════════════════════════════════ */
    _exportBL(id) {
      const bl  = DB.getById('bls', id);
      if(!bl) { this._notify('BL introuvable','error'); return; }
      const br  = bl.brId ? DB.getById('brs',bl.brId) : null;
      const sup = br ? DB.getById('suppliers',br.supplierId)||{} : {};
      const cli = bl.clientId ? DB.getById('clients',bl.clientId)||{} : {};
      const s   = this._settings();
      const doc = this._newDoc();

      const lines    = bl.lines||(br?br.lines||[]:[]);
      const totalHT  = bl.totalHT ||(br?br.totalHT:0)||0;
      const timbre   = bl.timbreAmount||(br?br.timbreAmount:0)||0;
      const totalTTC = bl.totalTTC||(br?br.totalTTC:0)||0;

      let y = this._drawCompanyHeader(doc,s,MT);
      y = this._drawBanner(doc,'BON DE LIVRAISON',y);
      y = this._drawInfoStrip(doc,[
        {label:'Date BL',   value:this._fmtDate(bl.date)},
        {label:'BR lié',    value:br?this._t(br.ref):'/'},
        {label:'Chauffeur', value:this._t(bl.driverName||'/')},
        {label:'Immat.',    value:this._t(bl.truckIMM||'/')},
      ],y);
      y+=4;

      const gap=4, cw2=(CW-gap)/2, boxH=42;

      /* LEFT: Our Company / Fournisseur */
      const supName=this._t(s.companyName||sup.name||'/');
      const compLines=[
        supName,
        `NIF : ${s.nif||'-'}`,
        `NIS : ${s.nis||'-'}`,
        `RC  : ${s.rc||'-'}`,
        `Tel : ${s.phone||'-'}`,
        `Adresse : ${this._t(s.address||'-')}`,
      ];
      this._drawEntityBox(doc,'Fournisseur / Origine',compLines,ML,y,cw2,boxH);

      /* RIGHT: Client / Destinataire */
      const cliLines=[
        this._t(cli.name||'Client non specifie'),
        `NIF : ${cli.nif||'-'}`,
        `NIS : ${cli.nis||'-'}`,
        `RC  : ${cli.rc||'-'}`,
        `AI  : ${cli.ai||'-'}`,
        `Adresse : ${this._t(cli.address||'-')}`,
        `Tel : ${cli.phone||'-'}`,
      ];
      this._drawEntityBox(doc,'Client / Destinataire',cliLines,ML+cw2+gap,y,cw2,boxH);
      y+=boxH+4;

      /* 6-col table — same COL_W as BR */
      /* Exact reference BC widths: 12+75+15+18+34+40 = 194 = CW ✓ */
      const COLS=[
        {label:'N°',                                            width:12, halign:'center'},
        {label:'DÉSIGNATION DES FOURNITURES / SERVICES',        width:75, halign:'left'},
        {label:'UNITÉ',                                         width:15, halign:'center'},
        {label:'QTÉ',                                           width:18, halign:'center'},
        {label:'P.U. HT',                                       width:34, halign:'center'},
        {label:'TOTAL HT',                                      width:40, halign:'center'},
      ];

      const bodyRows6=lines.map((l,i)=>{
        const qty=Number(l.qtyDelivered||l.qty||0),pu=Number(l.price||0),disc=Number(l.disc||0);
        const tot=qty*pu*(1-disc/100);
        return [
          String(i+1).padStart(2,'0'),
          this._t(l.designation||''),
          this._t(l.unit||'U'),
          this._fmtNum(qty),
          this._fmtMoney(pu)+(disc?` (-${disc}%)`:''),
          this._fmtMoney(tot),
        ];
      });
      if(!bodyRows6.length) bodyRows6.push(['01','','U','','',this._fmtMoney(0)]);

      const tEndY=this._buildTable(doc,y,COLS,bodyRows6,{totalHT,timbre,totalTTC,tvaAmount:bl.tvaAmount||0,tvaRate:bl.tvaRate||0});
      y=tEndY+4;

      const wd=this._amountWords(totalTTC);
      if(wd){
        doc.setFont('helvetica','italic'); doc.setFontSize(8); this._tc(doc,C.GRAY_TXT);
        const wl=doc.splitTextToSize(`Arretee a : ${wd} dinars algeriens`,CW);
        doc.text(wl,ML,y); y+=wl.length*4+3;
      }
      if(bl.notes){
        y+=2;
        doc.setFont('helvetica','normal'); doc.setFontSize(8); this._tc(doc,C.GRAY_TXT);
        const nl=doc.splitTextToSize(`Observations : ${this._t(bl.notes)}`,CW);
        doc.text(nl,ML,y); y+=nl.length*4+2;
      }

      /* 3 Sig blocks: Direction Générale LEFT, Chauffeur MID, Client RIGHT */
      this._drawSigBlock(doc,[
        {label:'Direction Générale', sub:this._t(s.companyName||sup.name||''), value:'', sub2:'Cachet & Signature'},
        {label:'Le Chauffeur / Livreur',   value:this._t(bl.driverName||''), sub:'Signature & Cachet'},
        {label:'Le Client / Destinataire', value:this._t(cli.name||''),      sub:'Signature & Cachet'},
      ], Math.max(y+4,PH-62), 44);

      this._drawFooter(doc,1,1);
      this._save(doc,`BL_${this._t(bl.ref||'BROUILLON').replace(/\//g,'_')}.pdf`);
    },

    /* ══════════════════════════════════════════════════════════
       DÉCHARGE CAISSE — 2 sig blocks only
    ══════════════════════════════════════════════════════════ */
    _exportDecharge(id) {
      const tx = DB.getById('caisse_admin',id)
              || DB.getById('caisse_transactions',id)
              || DB.getById('transactions',id);
      if(!tx){ this._notify('Transaction introuvable','error'); return; }

      const s   = this._settings();
      const doc = this._newDoc();
      const isDeposit = tx.type==='deposit';
      const title     = isDeposit?'BON DE VERSEMENT':'BON DE RETRAIT';
      const userName  = this._t(tx.userName||tx.createdByName||'/');
      const montant   = Number(tx.amount)||0;
      const ref       = this._t(tx.ref||`TX-${tx.id||'?'}`);

      let y = this._drawCompanyHeader(doc,s,MT);
      y = this._drawBanner(doc,title,y);
      y = this._drawInfoStrip(doc,[
        {label:'Date/Heure', value:this._fmtDateTime(tx.date||tx.createdAt)},
        {label:'N° Réf',     value:ref},
        {label:'Type',       value:isDeposit?'Versement':'Retrait'},
      ],y);
      y+=6;

      /* Detail card */
      const cardH=54;
      this._rect(doc,ML,y,CW,cardH,C.BG_INFO,C.LINE);
      this._rect(doc,ML,y,CW,8,C.LIGHT,C.LINE);
      doc.setFont('helvetica','bold'); doc.setFontSize(9); this._tc(doc,C.PRIMARY_DARK);
      doc.text("DÉTAILS DE L'OPÉRATION",ML+4,y+5.5);

      let cy=y+14;
      const rowF=(lbl,val,bold)=>{
        doc.setFont('helvetica','bold'); doc.setFontSize(8.5); this._tc(doc,C.GRAY_TXT);
        doc.text(lbl,ML+4,cy);
        doc.setFont('helvetica',bold?'bold':'normal');
        doc.setFontSize(bold?11:8.5);
        this._tc(doc,bold?C.PRIMARY:C.BLACK);
        doc.text(this._t(String(val||'/')),ML+62,cy);
        cy+=6.5;
      };
      rowF('Opérateur :',    userName);
      rowF('Date / Heure :', this._fmtDateTime(tx.date||tx.createdAt));
      rowF('Caisse :',       this._t(tx.accountName||'Caisse Principale'));
      rowF('Destination :',  this._t(tx.destination||'/'));
      rowF('Motif :',        this._t(tx.note||tx.description||'/'));
      cy+=2;
      rowF('MONTANT :',      this._fmtMoney(montant), true);
      y+=cardH+6;

      /* Amount in words */
      const wd=this._amountWords(montant);
      if(wd){
        doc.setFont('helvetica','italic'); doc.setFontSize(9); this._tc(doc,C.BLACK);
        const wl=doc.splitTextToSize(`Arretee a la somme de : ${wd} dinars algeriens`,CW);
        doc.text(wl,ML,y); y+=wl.length*4.5+4;
      }

      /* 2 Sig blocks: Responsable Caisse + DG */
      this._drawSigBlock(doc,[
        {label:'Le Responsable Caisse', sub:'Signature & Cachet'},
        {label:'Le Directeur Général',  sub:'Signature & Cachet'},
      ], Math.max(y+4,PH-62), 44);

      this._drawFooter(doc,1,1);
      this._save(doc,`DECHARGE_${ref.replace(/\//g,'_')}.pdf`);
    },

  }; /* end PDFGen */

  global.PDFGen = PDFGen;

})(window);
