/* Análisis de abandono escolar y factores asociados a partir de los archivos del SIMAT.
   Módulo sin DOM: lo usa la aplicación (index.html) y se puede probar en Node.
   Solo produce conteos agregados; no conserva datos personales. */
var ABANDONO = (function(){
  "use strict";
  var ACTIVOS = {MATRICULADO:1, REPROBADO:1, GRADUADO:1};
  var BASE = {MATRICULADO:1, REPROBADO:1, RETIRADO:1};

  // Variables analizadas: clave, nombre, categoría de referencia para el modelo, orden de categorías
  var VARIABLES = [
    {k:"sexo", n:"Sexo", ref:"Mujer", orden:["Mujer","Hombre"]},
    {k:"edad", n:"Edad para el grado", ref:"Edad adecuada", orden:["Edad adecuada","Extraedad de 2 años","Extraedad de 3 o más años"]},
    {k:"nivel", n:"Nivel", ref:"Primaria", orden:["Primaria","Secundaria","Media"]},
    {k:"trayecto", n:"Situación frente al año anterior", ref:"Promovido", orden:["Promovido","Repite el grado","Nuevo en los 46 municipios"]},
    {k:"zona", n:"Zona de la sede", ref:"Urbana", orden:["Urbana","Rural"]},
    {k:"sector", n:"Sector", ref:"Oficial", orden:["Oficial","Privado"]},
    {k:"modelo", n:"Modelo educativo", ref:"Tradicional", orden:["Tradicional","Escuela Nueva","Postprimaria","Media rural","Programas de extraedad","Otros modelos flexibles"]},
    {k:"jornada", n:"Jornada", ref:"Mañana o tarde", orden:["Mañana o tarde","Única o completa","Nocturna o fin de semana"]},
    {k:"estrato", n:"Estrato", ref:"Estrato 0–1", orden:["Estrato 0–1","Estrato 2","Estrato 3 o más","No aplica o sin dato"]},
    {k:"sisben", n:"Sisbén IV", ref:"A (pobreza extrema)", orden:["A (pobreza extrema)","B (pobreza moderada)","C (vulnerable)","D (no pobre ni vulnerable)","Sin Sisbén o sin dato"]},
    {k:"disc", n:"Discapacidad", ref:"Sin discapacidad", orden:["Sin discapacidad","Con discapacidad"]},
    {k:"trast", n:"Trastorno de aprendizaje o TDAH", ref:"No", orden:["No","Sí"]},
    {k:"etnia", n:"Pertenencia étnica", ref:"Ninguna", orden:["Ninguna","Pijao","Nasa (Páez)","Afrodescendiente","Otra etnia"]},
    {k:"origen", n:"País de origen", ref:"Colombia", orden:["Colombia","Venezuela","Otro país","Sin dato"]},
    {k:"campesino", n:"Población campesina", ref:"No", orden:["No","Sí","Sin dato"], fueraModelo:true}
  ];
  // Indicadores de perfil de riesgo para comparar municipios e instituciones
  var INDICADORES = [
    {id:"extra", n:"Extraedad", k:"edad", cats:["Extraedad de 2 años","Extraedad de 3 o más años"]},
    {id:"repite", n:"Repitentes", k:"trayecto", cats:["Repite el grado"]},
    {id:"nuevo", n:"Llegaron ese año", k:"trayecto", cats:["Nuevo en los 46 municipios"]},
    {id:"migr", n:"Migrantes", k:"origen", cats:["Venezuela","Otro país"]},
    {id:"rural", n:"Zona rural", k:"zona", cats:["Rural"]},
    {id:"flex", n:"Postprimaria o media rural", k:"modelo", cats:["Postprimaria","Media rural","Otros modelos flexibles"]},
    {id:"etnia", n:"Afro u otra etnia", k:"etnia", cats:["Afrodescendiente","Otra etnia"]},
    {id:"disc", n:"Con discapacidad", k:"disc", cats:["Con discapacidad"]}
  ];
  var UMBRAL_ALTO = 0.30, UMBRAL_MEDIO = 0.15;
  var TIPOS_DISC = ["Intelectual","Psicosocial","Múltiple","Espectro autista","Física","Sensorial (visual o auditiva)","Otra"];

  function norm(t){ return String(t == null ? "" : t).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().trim(); }
  function normCol(t){ return norm(t).replace(/[^A-Z0-9]/g, ""); }
  function columnas(cab){
    var h = cab.map(normCol);
    function c(){ for (var i = 0; i < arguments.length; i++){ var j = h.indexOf(arguments[i]); if (j >= 0) return j; } return -1; }
    return {sede:c("CODIGODANESEDE","DANESEDE","CODDANESEDE"), inst:c("DANE","CODIGODANE","DANEESTABLECIMIENTO"), id:c("PERID","IDPERSONA"), estado:c("ESTADO"), grado:c("GRADOCOD","GRADO"), fnac:c("FECHANACIMIENTO"), genero:c("GENERO","SEXO"),
      zona:c("ZONASEDE","ZONA"), sector:c("SECTOR"), jornada:c("JORNADA"), modelo:c("MODELO"), estrato:c("ESTRATO"), sisben:c("SISBENIV","SISBEN"),
      grupo:c("GRUPO"), doc:c("DOC","DOCUMENTO"), tdoc:c("TIPODOC"), ap1:c("APELLIDO1"), ap2:c("APELLIDO2"), n1:c("NOMBRE1"), n2:c("NOMBRE2"),
      nomSede:c("SEDE"), nomInst:c("INSTITUCION"), disc:c("DISCAPACIDAD"), etnia:c("ETNIA"), pais:c("PAISORIGEN"), tipodoc:c("TIPODOC"), campesino:c("CAMPESINO"), trast:c("TRAESPAPRESCOLAR")};
  }
  function v(c, i){ return i >= 0 ? c[i] : ""; }
  function edad(fn, anio){
    var m = String(fn || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/) || String(fn || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var d, mes, a;
    if (m[3].length === 4){ d = +m[1]; mes = +m[2]; a = +m[3]; } else { a = +m[1]; mes = +m[2]; d = +m[3]; }
    var e = anio - a - ((mes > 3 || (mes === 3 && d > 31)) ? 1 : 0); // edad al 31 de marzo
    return (e >= 3 && e <= 40) ? e : null;
  }
  function categorias(c, col, anio, g){
    var o = {}, t;
    t = norm(v(c, col.genero)); o.sexo = /^F/.test(t) ? "Mujer" : /^M/.test(t) ? "Hombre" : null;
    var e = edad(v(c, col.fnac), anio);
    if (e === null) o.edad = null; else { var x = e - (g + 5); o.edad = x <= 1 ? "Edad adecuada" : x === 2 ? "Extraedad de 2 años" : "Extraedad de 3 o más años"; }
    o.nivel = g <= 5 ? "Primaria" : g <= 9 ? "Secundaria" : "Media";
    t = norm(v(c, col.zona)); o.zona = /^U/.test(t) ? "Urbana" : /^R/.test(t) ? "Rural" : null;
    t = norm(v(c, col.sector)); o.sector = /^NO/.test(t) ? "Privado" : /^OF/.test(t) ? "Oficial" : null;
    t = norm(v(c, col.modelo));
    o.modelo = !t ? null : /TRADICIONAL/.test(t) ? "Tradicional" : /ESCUELA NUEVA/.test(t) ? "Escuela Nueva" : /POST ?PRIMARIA/.test(t) ? "Postprimaria" :
      /MEDIA RURAL/.test(t) ? "Media rural" : /EXTRAEDAD|ACELERACI|ADULTO/.test(t) ? "Programas de extraedad" : "Otros modelos flexibles";
    t = norm(v(c, col.jornada));
    o.jornada = /MANANA|TARDE/.test(t) ? "Mañana o tarde" : /UNICA|COMPLETA/.test(t) ? "Única o completa" : /NOCTURNA|FIN DE SEMANA/.test(t) ? "Nocturna o fin de semana" : null;
    t = norm(v(c, col.estrato)); var ne = (t.match(/ESTRATO\s*(\d)/) || [])[1];
    o.estrato = ne === undefined ? "No aplica o sin dato" : +ne <= 1 ? "Estrato 0–1" : +ne === 2 ? "Estrato 2" : "Estrato 3 o más";
    t = norm(v(c, col.sisben)).charAt(0);
    o.sisben = t === "A" ? "A (pobreza extrema)" : t === "B" ? "B (pobreza moderada)" : t === "C" ? "C (vulnerable)" : t === "D" && /^D\d/.test(norm(v(c, col.sisben))) ? "D (no pobre ni vulnerable)" : "Sin Sisbén o sin dato";
    t = norm(v(c, col.disc)); o.disc = (!t || t === "NO APLICA") ? "Sin discapacidad" : "Con discapacidad";
    o.tipoDisc = o.disc === "Sin discapacidad" ? null : /INTELECT/.test(t) ? "Intelectual" : /PSICOSOCIAL|MENTAL/.test(t) ? "Psicosocial" : /MULTIPLE/.test(t) ? "Múltiple" :
      /AUTIS/.test(t) ? "Espectro autista" : /FISICA/.test(t) ? "Física" : /VISUAL|AUDITIVA|SORDO|CEGUERA/.test(t) ? "Sensorial (visual o auditiva)" : "Otra";
    t = norm(v(c, col.trast)); o.trast = (!t || t === "NO APLICA") ? "No" : "Sí";
    t = norm(v(c, col.etnia));
    o.etnia = (!t || t === "NO APLICA") ? "Ninguna" : /PIJAO|COYAIMA|NATAGAIMA/.test(t) ? "Pijao" : /PAEZ|NASA/.test(t) ? "Nasa (Páez)" : /AFRO|NEGR|RAIZAL|PALENQ/.test(t) ? "Afrodescendiente" : "Otra etnia";
    t = norm(v(c, col.pais)); var doc = norm(v(c, col.tipodoc));
    o.origen = /VENEZUELA/.test(t) ? "Venezuela" : t === "COLOMBIA" ? "Colombia" : (t && !/NO ESPECIFICADO/.test(t)) ? "Otro país" : /^(PPT|PEP|CE|VISA)/.test(doc) ? "Otro país" : "Sin dato";
    t = norm(v(c, col.campesino)); o.campesino = t === "S" ? "Sí" : t === "N" ? "No" : "Sin dato";
    return o;
  }

  // Lee un año: registros por estudiante (grados 1 a 11) y conjunto de activos en cualquier grado
  // opc.nominal: conserva en memoria (no se guarda) los datos mínimos para ubicar al estudiante en su colegio
  function leerAnio(texto, anio, municipioDe, opc){
    opc = opc || {};
    var fin = texto.indexOf("\n"), cab = texto.slice(0, fin).replace(/^﻿/, "").replace(/\r$/, "");
    var sep = [";", "\t", "|", ","].sort(function(a,b){ return cab.split(b).length - cab.split(a).length; })[0];
    var col = columnas(cab.split(sep));
    if (col.id < 0 || col.estado < 0 || col.grado < 0) return null;
    var reg = new Map(), activos = new Set(), pos = fin + 1, n = texto.length;
    while (pos < n){
      var e = texto.indexOf("\n", pos); if (e < 0) e = n;
      var l = texto.slice(pos, e); pos = e + 1;
      if (l.charCodeAt(l.length-1) === 13) l = l.slice(0, -1);
      if (!l) continue;
      var c = l.split(sep), id = String(c[col.id]).trim(); if (!id) continue;
      var est = norm(c[col.estado]), g = parseInt(c[col.grado], 10);
      if (ACTIVOS[est]) activos.add(id);
      if (!(g >= 1 && g <= 11)) continue;
      var sc = String(v(c, col.sede)).trim(), ci = String(v(c, col.inst)).trim();
      var m = municipioDe(sc, ci); if (!m) continue;
      var r = {g:g, e:est, m:m, sc:sc, ci:ci, v:categorias(c, col, anio, g)};
      if (opc.nominal) r.pn = {doc:String(v(c, col.doc)).trim(), tdoc:String(v(c, col.tdoc)).split(":")[0].trim(),
        nombre:[v(c, col.n1), v(c, col.n2), v(c, col.ap1), v(c, col.ap2)].map(function(x){ return String(x || "").trim(); }).filter(Boolean).join(" "),
        grupo:String(v(c, col.grupo)).trim(), sede:String(v(c, col.nomSede)).trim(), inst:String(v(c, col.nomInst)).trim(), jornada:String(v(c, col.jornada)).trim()};
      reg.set(id, r);
    }
    return {anio:anio, reg:reg, activos:activos};
  }

  function nuevo(){
    var vars = {}; VARIABLES.forEach(function(x){ vars[x.k] = {}; }); vars.tipoDisc = {};
    return {anios:{}, vars:vars, grado:{}, municipio:{}, patrones:new Map(), cohorte:null};
  }
  function suma(o, k, ab){ var x = o[k] = o[k] || [0, 0]; x[0]++; if (ab) x[1]++; }

  // Procesa el año A.anio usando el anterior (P) y el siguiente (N); N puede faltar (solo retiro intraanual)
  function procesar(an, A, P, N, anioModeloDesde){
    var t = {n:0, retiro:0, aband:null, nAb:0};
    A.reg.forEach(function(r, id){
      if (!BASE[r.e]) return;
      t.n++; if (r.e === "RETIRADO") t.retiro++;
      var p = P ? P.reg.get(id) : undefined;
      r.v.trayecto = !P ? null : !p ? "Nuevo en los 46 municipios" : p.g >= r.g ? "Repite el grado" : "Promovido";
      // En 11° no hay grado siguiente (los que terminan se gradúan): el abandono interanual se mide de 1° a 10°
      if (!N || r.g === 11) return;
      var ab = !N.activos.has(id);
      t.nAb++; if (ab) t.aband = (t.aband || 0) + 1;
      VARIABLES.forEach(function(x){ var c = r.v[x.k]; if (c) suma(an.vars[x.k], c, ab); });
      if (r.v.tipoDisc) suma(an.vars.tipoDisc, r.v.tipoDisc, ab);
      suma(an.grado, r.g, ab); suma(an.municipio, r.m, ab);
      if (P && A.anio >= anioModeloDesde){
        var clave = VARIABLES.map(function(x){ return r.v[x.k] || "∅"; }).join("|") + "|" + A.anio + "|" + r.m;
        var pt = an.patrones.get(clave); if (!pt){ pt = [0, 0]; an.patrones.set(clave, pt); } pt[0]++; if (ab) pt[1]++;
      }
    });
    if (N && t.aband === null) t.aband = 0;
    an.anios[A.anio] = t;
  }

  // Seguimiento de la cohorte (grado 1° en el primer año) estudiante por estudiante
  function cohorteInicio(an, A, contar){
    var c = {anio0:A.anio, ids:new Map()};
    A.reg.forEach(function(r, id){ if (r.g === 1 && contar(r.e)) c.ids.set(id, {m:r.m, v:r.v, hist:{}}); });
    c.n = c.ids.size; an.cohorte = c;
  }
  function cohorteAnio(an, A){
    var c = an.cohorte; if (!c) return;
    c.ids.forEach(function(x, id){ var r = A.reg.get(id); if (r) x.hist[A.anio] = [r.g, r.e]; else if (A.activos.has(id)) x.hist[A.anio] = [0, "MATRICULADO"]; });
    c.ultimo = A.anio;
  }
  function cohorteResumen(an){
    var c = an.cohorte; if (!c || !c.ultimo) return null;
    var fin = c.ultimo, gEsperado = fin - c.anio0 + 1, R = {anio0:c.anio0, anioFin:fin, gradoEsperado:gEsperado, n:c.n,
      aTiempo:0, rezago:{}, otroGrado:0, graduado:0, fuera:0, salidaGrado:{}, salidaAnio:{}, repitieron:0, volvieron:0, porVar:{}, porMunicipio:{}};
    VARIABLES.forEach(function(x){ R.porVar[x.k] = {}; });
    c.ids.forEach(function(x){
      var h = x.hist, u = h[fin], estado;
      var grados = [], vistoFuera = false, volvio = false, ultimoActivo = null;
      for (var a = c.anio0; a <= fin; a++){
        var r = h[a];
        if (r && ACTIVOS[r[1]]){ if (vistoFuera) volvio = true; ultimoActivo = [a, r[0]]; if (r[0]) grados.push(r[0]); }
        else if (a > c.anio0) vistoFuera = true;
      }
      for (var i = 1; i < grados.length; i++) if (grados[i] <= grados[i-1]){ R.repitieron++; break; }
      if (volvio) R.volvieron++;
      var grad = Object.keys(h).some(function(a){ return h[a][1] === "GRADUADO"; });
      if (u && ACTIVOS[u[1]] && u[0] === gEsperado) { estado = "aTiempo"; R.aTiempo++; }
      else if (u && ACTIVOS[u[1]] && u[0] > 0 && u[0] < gEsperado){ estado = "rezago"; R.rezago[u[0]] = (R.rezago[u[0]] || 0) + 1; }
      else if (grad){ estado = "graduado"; R.graduado++; }
      else if (u && ACTIVOS[u[1]]){ estado = "otro"; R.otroGrado++; }
      else {
        estado = "fuera"; R.fuera++;
        if (ultimoActivo){ R.salidaGrado[ultimoActivo[1]] = (R.salidaGrado[ultimoActivo[1]] || 0) + 1; R.salidaAnio[ultimoActivo[0]] = (R.salidaAnio[ultimoActivo[0]] || 0) + 1; }
      }
      VARIABLES.forEach(function(vv){ var k = x.v[vv.k]; if (!k || vv.k === "trayecto" || vv.k === "nivel") return; var o = R.porVar[vv.k][k] = R.porVar[vv.k][k] || [0, 0, 0]; o[0]++; if (estado === "fuera") o[1]++; if (estado === "aTiempo") o[2]++; });
      var om = R.porMunicipio[x.m] = R.porMunicipio[x.m] || [0, 0, 0]; om[0]++; if (estado === "fuera") om[1]++; if (estado === "aTiempo") om[2]++;
    });
    return R;
  }

  // Regresión logística binomial sobre patrones agregados (Newton-Raphson)
  function regresion(an){
    var pats = an.patrones; if (!pats || !pats.size) return null;
    var anios = {}, cols = [], ix = {}, presentes = {};
    var NV = VARIABLES.length;
    pats.forEach(function(p, k){ var partes = k.split("|"); anios[partes[NV]] = 1; partes.forEach(function(c, i){ presentes[i + "=" + c] = 1; }); });
    var aniosL = Object.keys(anios).sort();
    VARIABLES.forEach(function(x, i){
      if (x.fueraModelo) return;
      x.orden.forEach(function(cat){ if (cat !== x.ref && presentes[i + "=" + cat]){ ix[i + "=" + cat] = cols.length; cols.push({vk:x.k, vn:x.n, cat:cat, ref:x.ref}); } });
    });
    aniosL.slice(1).forEach(function(a){ ix["a=" + a] = cols.length; cols.push({vk:"anio", vn:"Año", cat:a, ref:aniosL[0]}); });
    var K = cols.length + 1, filas = [];
    pats.forEach(function(p, k){
      var partes = k.split("|"), xs = [0];
      if (VARIABLES.some(function(x, i){ return !x.fueraModelo && partes[i] === "∅"; })) return; // casos completos
      for (var i = 0; i < VARIABLES.length; i++){ var j = ix[i + "=" + partes[i]]; if (j !== undefined) xs.push(j + 1); }
      var ja = ix["a=" + partes[NV]]; if (ja !== undefined) xs.push(ja + 1);
      filas.push({x:xs, n:p[0], y:p[1], m:partes[NV + 1], cats:partes.slice(0, NV)});
    });
    var nTot = filas.reduce(function(s, f){ return s + f.n; }, 0), yTot = filas.reduce(function(s, f){ return s + f.y; }, 0);
    var b = new Float64Array(K); b[0] = Math.log(yTot / (nTot - yTot));
    var H, it, conv = false;
    for (it = 0; it < 30; it++){
      var g = new Float64Array(K); H = new Float64Array(K*K);
      filas.forEach(function(f){
        var eta = 0; f.x.forEach(function(j){ eta += b[j]; });
        var p = 1 / (1 + Math.exp(-eta)), w = f.n * p * (1 - p), r = f.y - f.n * p;
        for (var a = 0; a < f.x.length; a++){ var ja = f.x[a]; g[ja] += r; for (var c = 0; c < f.x.length; c++) H[ja*K + f.x[c]] += w; }
      });
      for (var d = 0; d < K; d++) H[d*K + d] += 1e-9;
      var paso = resolver(H, g, K);
      var mx = 0; for (var q = 0; q < K; q++){ b[q] += paso[q]; mx = Math.max(mx, Math.abs(paso[q])); }
      if (mx < 1e-7){ conv = true; break; }
    }
    var inv = invertir(H, K);
    // Abandono observado y esperado (según el perfil de los estudiantes) por municipio, prevalencia de factores y AUC
    var mun = {}, puntos = [];
    filas.forEach(function(f){
      var eta = 0; f.x.forEach(function(j){ eta += b[j]; }); var pr = 1 / (1 + Math.exp(-eta));
      var o = mun[f.m] = mun[f.m] || {n:0, obs:0, esp:0, ind:{}};
      o.n += f.n; o.obs += f.y; o.esp += f.n * pr;
      INDICADORES.forEach(function(ind){ var i = VARIABLES.findIndex(function(x){ return x.k === ind.k; }); if (ind.cats.indexOf(f.cats[i]) >= 0) o.ind[ind.id] = (o.ind[ind.id] || 0) + f.n; });
      puntos.push([pr, f.y, f.n - f.y]);
    });
    puntos.sort(function(a, c){ return a[0] - c[0]; });
    var negAcum = 0, auc = 0, totP = 0, totN = 0;
    puntos.forEach(function(q){ auc += q[1] * (negAcum + q[2] / 2); negAcum += q[2]; totP += q[1]; totN += q[2]; });
    auc = totP && totN ? auc / (totP * totN) : null;
    var beta = {"_": b[0]}; cols.forEach(function(c, i){ beta[c.vk + "|" + c.cat] = b[i + 1]; });
    var res = cols.map(function(c, i){
      var j = i + 1, se = Math.sqrt(Math.max(inv[j*K + j], 0)), z = b[j] / se;
      return {vk:c.vk, vn:c.vn, cat:c.cat, ref:c.ref, or:Math.exp(b[j]), lo:Math.exp(b[j] - 1.96*se), hi:Math.exp(b[j] + 1.96*se), p:2*(1 - Phi(Math.abs(z)))};
    });
    return {coef:res, beta:beta, n:nTot, eventos:yTot, anios:aniosL, iter:it + 1, convergio:conv, auc:auc, porMunicipio:mun};
  }
  function resolver(H, g, K){ // Cholesky
    var L = cholesky(H, K), y = new Float64Array(K), x = new Float64Array(K), i, j, s;
    for (i = 0; i < K; i++){ s = g[i]; for (j = 0; j < i; j++) s -= L[i*K + j] * y[j]; y[i] = s / L[i*K + i]; }
    for (i = K-1; i >= 0; i--){ s = y[i]; for (j = i+1; j < K; j++) s -= L[j*K + i] * x[j]; x[i] = s / L[i*K + i]; }
    return x;
  }
  function cholesky(A, K){
    var L = new Float64Array(K*K);
    for (var i = 0; i < K; i++) for (var j = 0; j <= i; j++){
      var s = A[i*K + j]; for (var k = 0; k < j; k++) s -= L[i*K + k] * L[j*K + k];
      L[i*K + j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j*K + j];
    }
    return L;
  }
  function invertir(A, K){
    var inv = new Float64Array(K*K);
    for (var c = 0; c < K; c++){ var e = new Float64Array(K); e[c] = 1; var x = resolver(A, e, K); for (var r = 0; r < K; r++) inv[r*K + c] = x[r]; }
    return inv;
  }
  function erf(x){ var s = x < 0 ? -1 : 1; x = Math.abs(x); var t = 1/(1+0.3275911*x);
    return s*(1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x)); }
  function Phi(x){ return 0.5*(1+erf(x/Math.SQRT2)); }

  // Riesgo estimado de abandono para un estudiante (usa el efecto del último año del modelo)
  function riesgo(M, v){
    var B = M.beta, eta = B["_"] + (B["anio|" + M.anios[M.anios.length-1]] || 0);
    VARIABLES.forEach(function(x){ if (x.fueraModelo) return; var c = v[x.k]; if (c && B[x.k + "|" + c] !== undefined) eta += B[x.k + "|" + c]; });
    return 1 / (1 + Math.exp(-eta));
  }
  function marcas(v){
    var f = [];
    if (v.edad && v.edad !== "Edad adecuada") f.push(v.edad);
    if (v.trayecto === "Repite el grado") f.push("Repite el grado");
    if (v.trayecto === "Nuevo en los 46 municipios") f.push("Llegó este año");
    if (v.origen === "Venezuela" || v.origen === "Otro país") f.push("Migrante");
    if (v.disc === "Con discapacidad") f.push("Discapacidad");
    return f;
  }
  // Sistema de alerta temprana sobre el último año cargado: por institución, municipio y (opcional) por estudiante
  function alerta(A, M, nombreInst){
    if (!A || !M) return null;
    var inst = {}, mun = {}, nominal = [], tot = {n:0, alto:0, medio:0, esp:0, retirados:0};
    A.reg.forEach(function(r){
      var k = r.ci || r.sc, o = inst[k] = inst[k] || {ci:k, m:r.m, nombre:nombreInst(r), n:0, alto:0, medio:0, esp:0, retirados:0, extra:0, repite:0, nuevo:0, migr:0};
      var mm = mun[r.m] = mun[r.m] || {n:0, alto:0, medio:0, esp:0, retirados:0};
      if (r.e === "RETIRADO"){ o.retirados++; mm.retirados++; tot.retirados++;
        if (r.pn) nominal.push({r:r, p:null, nivel:"Retirado en " + A.anio + ": búsqueda activa", f:marcas(r.v)}); return; }
      if (!(r.e === "MATRICULADO" || r.e === "REPROBADO") || r.g > 10 || !r.v.trayecto) return;
      var p = riesgo(M, r.v), nivel = p >= UMBRAL_ALTO ? "Alto" : p >= UMBRAL_MEDIO ? "Medio" : "Bajo";
      o.n++; o.esp += p; mm.n++; mm.esp += p; tot.n++; tot.esp += p;
      if (nivel === "Alto"){ o.alto++; mm.alto++; tot.alto++; } else if (nivel === "Medio"){ o.medio++; mm.medio++; tot.medio++; }
      if (r.v.edad && r.v.edad !== "Edad adecuada") o.extra++;
      if (r.v.trayecto === "Repite el grado") o.repite++;
      if (r.v.trayecto === "Nuevo en los 46 municipios") o.nuevo++;
      if (r.v.origen === "Venezuela" || r.v.origen === "Otro país") o.migr++;
      if (r.pn && nivel !== "Bajo") nominal.push({r:r, p:p, nivel:nivel, f:marcas(r.v)});
    });
    return {anio:A.anio, umbrales:[UMBRAL_MEDIO, UMBRAL_ALTO], total:tot, porMunicipio:mun,
      porInstitucion:Object.keys(inst).map(function(k){ return inst[k]; }).filter(function(o){ return o.n || o.retirados; }), nominal:nominal};
  }

  // Resultado persistible (sin mapas ni datos individuales)
  function resumen(an){
    return {anios:an.anios, vars:an.vars, grado:an.grado, municipio:an.municipio, modelo:regresion(an), cohorte:cohorteResumen(an), creado:new Date().toISOString()};
  }
  return {VARIABLES:VARIABLES, TIPOS_DISC:TIPOS_DISC, INDICADORES:INDICADORES, riesgo:riesgo, alerta:alerta, leerAnio:leerAnio, nuevo:nuevo, procesar:procesar,
    cohorteInicio:cohorteInicio, cohorteAnio:cohorteAnio, resumen:resumen, _categorias:categorias, _columnas:columnas};
})();
if (typeof module !== "undefined") module.exports = ABANDONO;
