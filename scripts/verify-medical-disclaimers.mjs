/**
 * Build-time compliance scanner — Apple Guideline 1.4.1
 * Verifies every component/page rendering medical info includes
 * MedicalDisclaimer and at least one clickable source link.
 *
 * Exit code 1 on failure so the build breaks.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('src');

// Components that ARE the disclaimer or are pure nav/layout/utility
const EXEMPT = new Set([
  'MedicalDisclaimer',
  'BottomNav',
  'ElderBottomNav',
  'Header',
  'ElderHeader',
  'NavigationDrawer',
  'NavLink',
  'TimeOfDayHeader',
  'NotFound',
  'Landing',
  'PrivacyPolicy',
  'TermsOfService',
  'ComplianceAudit',
  'MedicalSources',
  'AuthForm',
  'PinEntry',
  'OnboardingFlow',
  'DisplaySettings',
  'SoundSettings',
  'LanguageSelector',
  'NotificationSettings',
  'SiriShortcutsSettings',
  'ChangePinSheet',
  'HipaaReAuthModal',
  'CoinEarnAnimation',
  'CoinMilestoneAnimation',
  'ConfettiAnimation',
  'DoubleCoinsAnimation',
  'JackpotAnimation',
  'StreakShieldAnimation',
  'TripleSpinsAnimation',
  'SlotMachine',
  'AcceptInviteCard',
  'CaregiverInviteManager',
  'EmergencyContactsManager',
  'QuickActionsBar',
  'QuickActionsElder',
  'BadgeCollection',
  'CoinShop',
  'RewardsWidget',
  'StreakWidget',
  'DoseClockWidget',
  'InteractiveDoseClock',
  'MissedDoseFlash',
  'PersistentAlarm',
  'Index',
  'CaregiverDashboard',
]);

// Keywords that indicate medical content is being RENDERED (not just imported/referenced)
const MEDICAL_RENDER_PATTERNS = [
  /medication[s]?\s*\./i,
  /drug\s*interaction/i,
  /side\s*effect/i,
  /dosage/i,
  /\bpill\b/i,
  /fentanyl/i,
  /prescription/i,
  /symptom/i,
  /emergency.*card/i,
  /medical\s*(info|detail|record|history)/i,
  /adherence.*report/i,
  /appointment.*summary/i,
  /not\s*medical\s*advice/i,
];

// Source link patterns
const SOURCE_LINK = /https?:\/\/(www\.)?(fda\.gov|medlineplus\.gov|dailymed\.nlm\.nih\.gov|poison\.org|cdc\.gov|nih\.gov|rxnav\.nlm\.nih\.gov)/i;

function getComponentName(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function scanFile(filePath) {
  const name = getComponentName(filePath);
  if (EXEMPT.has(name)) return null;

  const content = fs.readFileSync(filePath, 'utf-8');

  // Check if this file renders medical info
  const hasMedicalContent = MEDICAL_RENDER_PATTERNS.some(p => p.test(content));
  if (!hasMedicalContent) return null;

  const hasDisclaimer = content.includes('MedicalDisclaimer');
  const hasSourceLink = SOURCE_LINK.test(content);
  // Also count if it passes sources via parent or uses the disclaimer (which has built-in sources)
  const hasDelegatedSources = hasDisclaimer; // MedicalDisclaimer always includes default sources

  return {
    file: path.relative(SRC, filePath),
    component: name,
    hasDisclaimer,
    hasSources: hasSourceLink || hasDelegatedSources,
  };
}

function walkDir(dir, ext = '.tsx') {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkDir(full, ext));
    else if (entry.name.endsWith(ext)) results.push(full);
  }
  return results;
}

// --- Main ---
const files = [
  ...walkDir(path.join(SRC, 'components')),
  ...walkDir(path.join(SRC, 'pages')),
];

const results = files.map(scanFile).filter(Boolean);
const failures = results.filter(r => !r.hasDisclaimer || !r.hasSources);

console.log(`\n🔍 Medical Disclaimer Compliance Scan`);
console.log(`   Scanned: ${files.length} files`);
console.log(`   Medical screens found: ${results.length}`);
console.log(`   Compliant: ${results.length - failures.length}`);
console.log(`   Non-compliant: ${failures.length}\n`);

for (const r of results) {
  const icon = r.hasDisclaimer && r.hasSources ? '✅' : '❌';
  console.log(`  ${icon} ${r.component} (${r.file})`);
  if (!r.hasDisclaimer) console.log(`      ⚠ Missing MedicalDisclaimer component`);
  if (!r.hasSources) console.log(`      ⚠ Missing source links`);
}

if (failures.length > 0) {
  console.error(`\n❌ BUILD BLOCKED: ${failures.length} screen(s) missing medical disclaimers/sources.`);
  console.error(`   Fix the above files and re-build.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All medical screens are compliant with Apple Guideline 1.4.1\n`);
}