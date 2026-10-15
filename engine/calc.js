/* 사주 계산 엔진 v2.0 — 사주계산_규칙서.md (v2) 1층·2층
   기준: 국내 만세력 프로그램 방식 (샘플 7건으로 검증)
   - 시간: 기록 시각 → 서머타임이면 -60분 → 표준시가 동경 135°(UTC+9)인 시기면 -30분 (127°30′ 기준)
   - 일주: 보정 시각 23:00부터 다음 날 (라이브러리 sect 1)
   - 연주·월주: 실제 출생 순간을 라이브러리 절입 시각(UTC+8 기준)과 비교
   - 음력 ↔ 양력: 한국천문연구원 기준 (korean-lunar-calendar)
   - 나이: 세는 나이 / 대운수: 반올림, 최소 1
   필요: lunar-javascript@1.7.3 (Solar, Lunar), korean-lunar-calendar@0.3.6 (KoreanLunarCalendar) */
(function (root) {
  const RULE_VERSION = '2.0';
  const LIBS = 'lunar-javascript@1.7.3, korean-lunar-calendar@0.3.6';

  /* ── 기본 표 ── */
  const GAN = '甲乙丙丁戊己庚辛壬癸', ZHI = '子丑寅卯辰巳午未申酉戌亥';
  const KO = {甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계',
    子:'자',丑:'축',寅:'인',卯:'묘',辰:'진',巳:'사',午:'오',未:'미',申:'신',酉:'유',戌:'술',亥:'해'};
  const EL_OF = c => { const g = GAN.indexOf(c); if (g >= 0) return ['wood','wood','fire','fire','earth','earth','metal','metal','water','water'][g];
    return {子:'water',丑:'earth',寅:'wood',卯:'wood',辰:'earth',巳:'fire',午:'fire',未:'earth',申:'metal',酉:'metal',戌:'earth',亥:'water'}[c]; };
  const EL_HAN = {wood:'木',fire:'火',earth:'土',metal:'金',water:'水'};
  const GEN = {wood:'fire',fire:'earth',earth:'metal',metal:'water',water:'wood'};   // 생
  const CTL = {wood:'earth',earth:'water',water:'fire',fire:'metal',metal:'wood'};   // 극
  const isYang = c => { const g = GAN.indexOf(c); return g >= 0 ? g % 2 === 0 : ZHI.indexOf(c) % 2 === 0; };

  // 지장간 [여기, 중기, 본기] (프로그램 표, 중기 없음은 null)
  const HIDE = { 子:['壬',null,'癸'], 丑:['癸','辛','己'], 寅:['戊','丙','甲'], 卯:['甲',null,'乙'], 辰:['乙','癸','戊'], 巳:['戊','庚','丙'],
                 午:['丙','己','丁'], 未:['丁','乙','己'], 申:['戊','壬','庚'], 酉:['庚',null,'辛'], 戌:['辛','丁','戊'], 亥:['戊','甲','壬'] };
  const mainOf = c => GAN.includes(c) ? c : HIDE[c][2];          // 지지는 본기로 십성 판단

  /* 십성 */
  function tenGod(dayGan, c) {
    const t = mainOf(c), me = EL_OF(dayGan), el = EL_OF(t), same = isYang(dayGan) === isYang(t);
    if (me === el) return same ? '비견' : '겁재';
    if (GEN[me] === el) return same ? '식신' : '상관';
    if (CTL[me] === el) return same ? '편재' : '정재';
    if (CTL[el] === me) return same ? '편관' : '정관';
    return same ? '편인' : '정인';
  }
  const GROUP = {비견:'비겁',겁재:'비겁',식신:'식상',상관:'식상',편재:'재성',정재:'재성',편관:'관성',정관:'관성',편인:'인성',정인:'인성'};
  const groupElement = (dayGan, g) => { const me = EL_OF(dayGan);
    return {비겁: me, 식상: GEN[me], 재성: CTL[me], 관성: Object.keys(CTL).find(k => CTL[k] === me), 인성: Object.keys(GEN).find(k => GEN[k] === me)}[g]; };

  /* 12운성: 양간 순행, 음간 역행 */
  const STAGES = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
  const BIRTH = {甲:'亥',丙:'寅',戊:'寅',庚:'巳',壬:'申',乙:'午',丁:'酉',己:'酉',辛:'子',癸:'卯'};
  function stage(gan, zhi) {
    const s = ZHI.indexOf(BIRTH[gan]), z = ZHI.indexOf(zhi);
    return STAGES[isYang(gan) ? (z - s + 12) % 12 : (s - z + 12) % 12];
  }

  /* 납음 (60갑자 2개씩) */
  const NAYIN = ['해중금','노중화','대림목','노방토','검봉금','산두화','간하수','성두토','백랍금','양류목','천중수','옥상토','벽력화','송백목','장류수',
                 '사중금','산하화','평지목','벽상토','금박금','복등화','천하수','대역토','차천금','상자목','대계수','사중토','천상화','석류목','대해수'];
  const jiaziIdx = gz => { for (let i = 0; i < 60; i++) if (GAN[i % 10] === gz[0] && ZHI[i % 12] === gz[1]) return i; return -1; };
  const nayin = gz => NAYIN[Math.floor(jiaziIdx(gz) / 2)];
  /* 공망: 같은 순(旬)의 빈 지지 두 개 */
  const kongmang = gz => { const i = jiaziIdx(gz), start = i - (i % 10), z0 = ZHI.indexOf(ZHI[start % 12]); return ZHI[(z0 + 10) % 12] + ZHI[(z0 + 11) % 12]; };
  /* 천을귀인 (양귀인, 음귀인) */
  const NOBLE = {甲:'未丑',乙:'申子',丙:'酉亥',丁:'亥酉',戊:'丑未',己:'子申',庚:'丑未',辛:'寅午',壬:'卯巳',癸:'巳卯'};
  /* 12신살: 기준 지지의 삼합 → 겁살 시작 지지 */
  const SAL12 = ['겁살','재살','천살','지살','년살','월살','망신살','장성살','반안살','역마살','육해살','화개살'];
  const SAL_START = {申:'巳',子:'巳',辰:'巳', 寅:'亥',午:'亥',戌:'亥', 巳:'寅',酉:'寅',丑:'寅', 亥:'申',卯:'申',未:'申'};
  const sal12 = (base, z) => SAL12[(ZHI.indexOf(z) - ZHI.indexOf(SAL_START[base]) + 12) % 12];

  /* ── 시간 ── */
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  const wallOf = ms => { const p = {}; fmt.formatToParts(new Date(ms)).forEach(x => { p[x.type] = +x.value; });
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second); };
  // 기록 시각(서울 벽시계) → UTC, 그 시각의 UTC 오프셋, 서머타임 여부
  function seoulToUtc(y, m, d, hh, mm) {
    const wall = Date.UTC(y, m - 1, d, hh, mm), c = [];
    for (const off of [480, 510, 540, 570, 600]) { const u = wall - off * 60000; if (wallOf(u) === wall) c.push({ utc: u, off }); }
    if (c.length) { c.sort((a, b) => a.utc - b.utc); return { ...c[0], ambiguous: c.length > 1, nonexistent: false }; }
    const b = wall - 3 * 3600000, off = Math.round((wallOf(b) - b) / 60000);
    return { utc: wall - off * 60000, off, ambiguous: false, nonexistent: true };
  }

  const pad = n => String(n).padStart(2, '0');
  const F = ms => { const d = new Date(ms); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() }; };
  const solarOf = ms => { const f = F(ms); return Solar.fromYmdHms(f.y, f.m, f.d, f.h, f.mi, 0); };
  const hm = ms => { const f = F(ms); return `${pad(f.h)}:${pad(f.mi)}`; };
  const ymd = ms => { const f = F(ms); return `${f.y}-${pad(f.m)}-${pad(f.d)}`; };

  // 시진만 아는 경우: 그날 해당 시진의 시작 시각(보정 전 기록 시각 기준으로 시진 중앙에 오도록 +30분)
  const SIJIN_TIME = ['00:30','01:30','03:30','05:30','07:30','09:30','11:30','13:30','15:30','17:30','19:30','21:30'];

  /* 한국 음력 → 양력 */
  function koreanLunarToSolar(y, m, d, leap) {
    const c = new KoreanLunarCalendar();
    if (!c.setLunarDate(y, m, d, !!leap)) throw new Error('없는 음력 날짜');
    const s = c.getSolarCalendar();
    // 라이브러리는 없는 윤달·날짜도 다른 날로 바꿔버려서, 되돌려 확인
    const back = koreanSolarToLunar(s.year, s.month, s.day);
    if (back.y !== y || back.m !== m || back.d !== d || back.leap !== !!leap) throw new Error('없는 음력 날짜');
    return [s.year, s.month, s.day];
  }
  function koreanSolarToLunar(y, m, d) {
    const c = new KoreanLunarCalendar(); c.setSolarDate(y, m, d);
    const l = c.getLunarCalendar(); return { y: l.year, m: l.month, d: l.day, leap: !!l.intercalation };
  }

  /* 기둥 하나의 상세 */
  function pillarDetail(dayGan, gz, key) {
    const g = gz[0], z = gz[1];
    return { key, gz, g, z, ko: KO[g] + KO[z],
      sg: key === 'day' ? '일간' : tenGod(dayGan, g), sz: tenGod(dayGan, z),
      hide: HIDE[z].map(x => x ? { gan: x, ss: tenGod(dayGan, x) } : null),
      bong: stage(dayGan, z), geo: stage(g, z), nayin: nayin(gz) };
  }

  /**
   * @param {object} inp { calendar:'solar'|'lunar'|'leap', y, m, d, time:'HH:MM'|null, sijin:0~11|null, gender:0(여)|1(남), now?:Date }
   */
  function calculate(inp) {
    const now = inp.now || new Date(), thisYear = now.getFullYear();
    // 1) 날짜: 음력이면 한국 음력으로 양력 변환
    let [sy, sm, sd] = [inp.y, inp.m, inp.d];
    if (inp.calendar !== 'solar') [sy, sm, sd] = koreanLunarToSolar(inp.y, inp.m, inp.d, inp.calendar === 'leap');
    const lunar = koreanSolarToLunar(sy, sm, sd);

    // 2) 시각: 정확한 시각 > 시진 > 모름(12:00)
    const mode = inp.time ? 'time' : (inp.sijin != null ? 'sijin' : 'unknown');
    const rec = mode === 'time' ? inp.time : mode === 'sijin' ? SIJIN_TIME[inp.sijin] : '12:00';
    const [hh, mm] = rec.split(':').map(Number);
    const tz = seoulToUtc(sy, sm, sd, hh, mm);
    // 한국 서머타임은 +10:00(표준 +9) 또는 +9:30(표준 +8:30)
    const stdOff = tz.off === 600 ? 540 : tz.off === 570 ? 510 : tz.off;
    const dst = tz.off > stdOff;                                   // 서머타임 적용 중
    const dstMin = dst ? tz.off - stdOff : 0;                      // 보통 60분
    const lonMin = stdOff === 540 ? 30 : 0;                        // UTC+9(135°) 시기만 127°30′ 기준 -30분
    const wall = Date.UTC(sy, sm - 1, sd, hh, mm);
    const corrected = wall - (dstMin + lonMin) * 60000;            // 사주에 쓰는 보정 시각

    // 3) 연주·월주: 실제 순간(UTC)을 UTC+8로 바꿔 라이브러리 절입과 비교
    const ecY = solarOf(tz.utc + 8 * 3600000).getLunar().getEightChar();
    // 4) 일주·시주: 보정 시각, 23시부터 다음 날 (sect 1)
    const ecD = solarOf(corrected).getLunar().getEightChar(); ecD.setSect(1);
    const gz = { year: ecY.getYear(), month: ecY.getMonth(), day: ecD.getDay(), hour: ecD.getTime() };
    const dg = gz.day[0];
    const P = ['hour','day','month','year'].map(k => pillarDetail(dg, gz[k], k));
    const byKey = Object.fromEntries(P.map(p => [p.key, p]));

    // 5) 음양·오행·십성 개수 (8글자 단순 개수, 십성은 일간 제외 7글자·지지는 본기)
    const chars = P.flatMap(p => [p.g, p.z]);
    const yinyang = { 양: chars.filter(isYang).length, 음: chars.filter(c => !isYang(c)).length };
    const elements = { wood:0, fire:0, earth:0, metal:0, water:0 }; chars.forEach(c => elements[EL_OF(c)]++);
    const others = P.flatMap(p => p.key === 'day' ? [p.z] : [p.g, p.z]);
    const groups = { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 }; others.forEach(c => groups[GROUP[tenGod(dg, c)]]++);

    // 6) 강약: 득령(월지) · 득지(일지) · 득세(년간·년지·월간·시간·시지 중 비겁·인성 3개 이상)
    const helps = c => ['비겁','인성'].includes(GROUP[tenGod(dg, c)]);
    const deukryeong = helps(byKey.month.z), deukji = helps(byKey.day.z);
    const seCount = [byKey.year.g, byKey.year.z, byKey.month.g, byKey.hour.g, byKey.hour.z].filter(helps).length;
    const deukse = seCount >= 3;
    const key3 = `${+deukryeong}${+deukji}${+deukse}`;
    // 확인된 조합: 000 극신약, 001 신약, 100 강변약, 110 신강 / 나머지는 기본값(🟡)
    const STRENGTH = { '000':'극신약', '001':'신약', '100':'강변약', '110':'신강', '010':'신약', '101':'신강', '011':'신강', '111':'극신강' };
    const strength = STRENGTH[key3];
    const strong = ['신강','극신강'].includes(strength);
    const verifiedStrength = ['000','001','100','110'].includes(key3);

    // 7) 용신·5신: 약하면 비겁 / 강하면 관성(없으면 식상, 그것도 없으면 재성 🟡)
    const yongGroup = !strong ? '비겁' : groups.관성 ? '관성' : groups.식상 ? '식상' : '재성';
    const yong = groupElement(dg, yongGroup);
    const hee = Object.keys(GEN).find(k => GEN[k] === yong);          // 용신을 생
    const gi = Object.keys(CTL).find(k => CTL[k] === yong);           // 용신을 극
    const gu = Object.keys(GEN).find(k => GEN[k] === gi);             // 기신을 생
    const han = Object.keys(GEN).find(k => ![yong, hee, gi, gu].includes(k));
    const fiveGods = { 용신: yong, 희신: hee, 기신: gi, 구신: gu, 한신: han };

    // 8) 신살: 공망·천을귀인·12신살
    const shinsal = {
      kongmang: { year: kongmang(gz.year), day: kongmang(gz.day) },
      noble: NOBLE[dg],
      sal12: Object.fromEntries(P.map(p => [p.key, { byYear: sal12(byKey.year.z, p.z), byDay: sal12(byKey.day.z, p.z) }]))
    };

    // 9) 대운: 방향(라이브러리), 대운수 반올림·최소 1, 세는 나이
    const yun = ecY.getYun(inp.gender, 2);
    const yunYears = yun.getStartYear() + yun.getStartMonth() / 12 + yun.getStartDay() / 360;
    const daeunsu = Math.max(1, Math.round(yunYears));
    const dayun = yun.getDaYun().slice(1, 11).map((d, i) => {
      const age = daeunsu + i * 10, startYear = sy + age - 1;
      return { ...pillarDetail(dg, d.getGanZhi(), 'daeun'), age, startYear, endYear: startYear + 9,
               sal: { byYear: sal12(byKey.year.z, d.getGanZhi()[1]), byDay: sal12(byKey.day.z, d.getGanZhi()[1]) } };
    });

    // 10) 년운 (작년~9년 뒤), 월운 (올해·내년 양력 1~12월, 그달 15일의 절월)
    const yearGZ = y => GAN[(y - 4 + 6000) % 10] + ZHI[(y - 4 + 6000) % 12];
    const withSal = (o, z) => ({ ...o, sal: { byYear: sal12(byKey.year.z, z), byDay: sal12(byKey.day.z, z) } });
    const yearly = Array.from({ length: 11 }, (_, i) => thisYear - 1 + i).map(y =>
      withSal({ year: y, age: y - sy + 1, ...pillarDetail(dg, yearGZ(y), 'year_luck') }, yearGZ(y)[1]));
    const monthly = [thisYear, thisYear + 1].flatMap(y => Array.from({ length: 12 }, (_, i) => {
      const g = Solar.fromYmd(y, i + 1, 15).getLunar().getMonthInGanZhiExact();
      return withSal({ year: y, month: i + 1, ...pillarDetail(dg, g, 'month_luck') }, g[1]);
    }));

    // 11) 알림
    const cf = F(corrected), cMin = cf.h * 60 + cf.mi;
    const nearHour = mode === 'time' && [1,3,5,7,9,11,13,15,17,19,21,23].some(b => Math.abs(cMin - b * 60) <= 10 || Math.abs(cMin - b * 60 + 1440) <= 10);
    const lc = solarOf(tz.utc + 8 * 3600000).getLunar();
    const jieMin = Math.min(Math.abs(solarOf(tz.utc + 8 * 3600000).subtractMinute(lc.getPrevJie().getSolar())),
                            Math.abs(lc.getNextJie().getSolar().subtractMinute(solarOf(tz.utc + 8 * 3600000))));
    const flags = { time_mode: mode, hour_boundary: nearHour, term_boundary: jieMin <= 120,
                    dst_nonexistent_time: tz.nonexistent, dst_ambiguous_time: tz.ambiguous,
                    strength_rule_verified: verifiedStrength, yong_rule_verified: !strong || (strength === '신강' && (groups.관성 > 0 || groups.식상 > 0)) };

    return {
      rule_version: RULE_VERSION, libraries: LIBS,
      input: { ...inp, now: undefined, solar_date: `${sy}-${pad(sm)}-${pad(sd)}`,
               lunar_date: `${lunar.y}-${pad(lunar.m)}-${pad(lunar.d)}${lunar.leap ? ' (윤달)' : ''}` },
      time: { recorded: mode === 'unknown' ? '모름(12:00 간주)' : mode === 'sijin' ? `${ZHI[inp.sijin]}時` : rec,
              utc_offset: `+${pad(Math.floor(tz.off / 60))}:${pad(tz.off % 60)}`, dst, dst_correction_min: -dstMin,
              longitude_correction_min: -lonMin, corrected: `${ymd(corrected)} ${hm(corrected)}`, day_boundary: '23:00' },
      gz, P, dayGan: dg, yinyang, elements, groups,
      strength: { label: strength, deukryeong, deukji, deukse, seCount },
      yong: { group: yongGroup, fiveGods, fiveGodsHan: Object.fromEntries(Object.entries(fiveGods).map(([k, v]) => [k, EL_HAN[v]])) },
      shinsal, daeunsu, dayun, yearly, monthly, flags,
      age_now: thisYear - sy + 1
    };
  }

  root.SajuCalc = { calculate, tenGod, stage, nayin, kongmang, sal12, HIDE, NOBLE, KO, EL_HAN, RULE_VERSION,
                    SIJIN: ZHI.split('').map((z, i) => ({ i, z, label: `${KO[z]}시 (${['23:30~01:29','01:30~03:29','03:30~05:29','05:30~07:29','07:30~09:29','09:30~11:29','11:30~13:29','13:30~15:29','15:30~17:29','17:30~19:29','19:30~21:29','21:30~23:29'][i]})` })) };
})(typeof window !== 'undefined' ? window : globalThis);
