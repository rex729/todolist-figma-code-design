// ⚠️ 此檔案由 build_plugin.sh 自動從 foundations.js / components.js / helpers/* / screens/*.js 生成，請勿手動修改！
const PLUGIN_BUILD_TIME = "2026-11-20 22:57:43";

/**
 * MCPTest Figma Design-as-Code — 共用工具函式庫 (Helpers)
 * ⚠️ 修改本檔後，請務必執行 `sh FigmaDesigner/build_plugin.sh` 同步更新 Figma Plugin。
 *
 * 提供所有 `screens/*.js` 共用的字體載入、Token 綁定器、頁面查詢與排序功能。
 */
async function createFigmaDesignerContext() {
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
  ]);

  const allVars = await figma.variables.getLocalVariablesAsync();
  const varMap = Object.fromEntries(allVars.map(v => [v.name, v]));
  const textStyles = await figma.getLocalTextStylesAsync();
  const tsMap = Object.fromEntries(textStyles.map(t => [t.name, t]));
  const effectStyles = await figma.getLocalEffectStylesAsync();
  const esMap = Object.fromEntries(effectStyles.map(e => [e.name, e]));

  function bindFill(node, varName, fallbackRgb = { r: 1, g: 1, b: 1 }) {
    const v = varMap[varName];
    const basePaint = { type: 'SOLID', color: fallbackRgb };
    node.fills = [v ? figma.variables.setBoundVariableForPaint(basePaint, 'color', v) : basePaint];
  }

  function bindStroke(node, varName, fallbackRgb = { r: 0.9, g: 0.9, b: 0.9 }) {
    const v = varMap[varName];
    const basePaint = { type: 'SOLID', color: fallbackRgb };
    node.strokes = [v ? figma.variables.setBoundVariableForPaint(basePaint, 'color', v) : basePaint];
  }

  function bindFloat(node, prop, varName, fallbackVal) {
    const v = varMap[varName];
    if (v) {
      node.setBoundVariable(prop, v);
    } else if (fallbackVal !== undefined) {
      node[prop] = fallbackVal;
    }
  }

  async function applyTextStyle(textNode, styleName) {
    if (tsMap[styleName]) {
      await textNode.setTextStyleIdAsync(tsMap[styleName].id);
    }
  }

  async function applyEffectStyle(node, styleName) {
    if (esMap[styleName]) {
      await node.setEffectStyleIdAsync(esMap[styleName].id);
    }
  }

  async function getOrCreatePage(targetName, aliases = []) {
    const candidates = [targetName.toLowerCase(), ...aliases.map(a => a.toLowerCase())];
    let page = figma.root.children.find(p =>
      candidates.some(c => p.name.toLowerCase().includes(c))
    );
    if (!page) {
      page = figma.createPage();
      page.name = targetName;
    }
    await figma.setCurrentPageAsync(page);
    return page;
  }

  async function cleanupEmptyPage1AndSort() {
    for (const p of [...figma.root.children]) {
      if (
        p.id !== figma.currentPage.id &&
        p.name === 'Page 1' &&
        figma.root.children.length > 1
      ) {
        await p.loadAsync();
        if (p.children.length === 0) {
          p.remove();
        }
      }
    }

    const compPage = figma.root.children.find(p => p.name === 'Components');
    const nonCompPages = figma.root.children.filter(p => p.name !== 'Components');
    const ordered = compPage ? [...nonCompPages, compPage] : nonCompPages;
    ordered.forEach((p, idx) => {
      try {
        figma.root.insertChild(idx, p);
      } catch (_) {
        // 忽略部分權限限制
      }
    });
  }

  return {
    varMap,
    tsMap,
    esMap,
    bindFill,
    bindStroke,
    bindFloat,
    applyTextStyle,
    applyEffectStyle,
    getOrCreatePage,
    cleanupEmptyPage1AndSort
  };
}

async function runFoundations() {
function hexToRgba(hex) {
    const clean = hex.replace('#', '');
    const hasAlpha = clean.length === 8;
    return {
      r: parseInt(clean.substring(0, 2), 16) / 255,
      g: parseInt(clean.substring(2, 4), 16) / 255,
      b: parseInt(clean.substring(4, 6), 16) / 255,
      a: hasAlpha ? parseInt(clean.substring(6, 8), 16) / 255 : 1
    };
  }

  // ===========================================================================
  // 1. ColorCollection (42 個色彩變數：light/* 21 + dark/* 21)
  // ===========================================================================
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const matchingColorColls = collections.filter(c => c.name === 'ColorCollection');
  let colorColl = matchingColorColls[0];
  if (!colorColl) {
    colorColl = figma.variables.createVariableCollection('ColorCollection');
  }
  // 刪除多餘同名重複的 ColorCollection
  for (let i = 1; i < matchingColorColls.length; i++) {
    matchingColorColls[i].remove();
  }
  const colorModeId = colorColl.modes[0].modeId;
  if (colorColl.modes[0].name !== 'Value') {
    colorColl.renameMode(colorModeId, 'Value');
  }

  const baseColorSpecs = [
    // Background & Surface
    { path: 'bg/canvas',   light: '#F5F7FA', dark: '#0B0F17', scopes: ['FRAME_FILL', 'SHAPE_FILL'], web: 'var(--color-bg-canvas)',   android: 'colorBgCanvas',   ios: 'Color.bgCanvas',   desc: 'App main page background' },
    { path: 'bg/surface',  light: '#FFFFFF', dark: '#151C28', scopes: ['FRAME_FILL', 'SHAPE_FILL'], web: 'var(--color-bg-surface)',  android: 'colorBgSurface',  ios: 'Color.bgSurface',  desc: 'Card and list item surface' },
    { path: 'bg/elevated', light: '#FFFFFF', dark: '#1E2736', scopes: ['FRAME_FILL', 'SHAPE_FILL'], web: 'var(--color-bg-elevated)', android: 'colorBgElevated', ios: 'Color.bgElevated', desc: 'Modal, bottom sheet, and floating dialog surface' },
    { path: 'bg/subtle',   light: '#EEF2F6', dark: '#253042', scopes: ['FRAME_FILL', 'SHAPE_FILL'], web: 'var(--color-bg-subtle)',   android: 'colorBgSubtle',   ios: 'Color.bgSubtle',   desc: 'Secondary container and input field background' },
    // Brand & Action
    { path: 'brand/primary',         light: '#0066FF', dark: '#3385FF', scopes: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL', 'STROKE_COLOR'], web: 'var(--color-brand-primary)',         android: 'colorBrandPrimary',         ios: 'Color.brandPrimary',         desc: 'Primary brand color (CTA buttons)' },
    { path: 'brand/primary-pressed', light: '#0052CC', dark: '#66A3FF', scopes: ['FRAME_FILL', 'SHAPE_FILL'],                               web: 'var(--color-brand-primary-pressed)', android: 'colorBrandPrimaryPressed', ios: 'Color.brandPrimaryPressed', desc: 'Primary CTA button pressed state' },
    { path: 'brand/secondary',       light: '#E6F0FF', dark: '#122B54', scopes: ['FRAME_FILL', 'SHAPE_FILL'],                               web: 'var(--color-brand-secondary)',       android: 'colorBrandSecondary',       ios: 'Color.brandSecondary',       desc: 'Secondary brand tint background' },
    { path: 'brand/accent',          light: '#F59E0B', dark: '#FBBF24', scopes: ['FRAME_FILL', 'SHAPE_FILL', 'TEXT_FILL'],                  web: 'var(--color-brand-accent)',          android: 'colorBrandAccent',          ios: 'Color.brandAccent',          desc: 'Accent highlight color' },
    // Text & Icon
    { path: 'text/primary',   light: '#111827', dark: '#F9FAFB', scopes: ['TEXT_FILL', 'SHAPE_FILL'], web: 'var(--color-text-primary)',   android: 'colorTextPrimary',   ios: 'Color.textPrimary',   desc: 'Primary text and headings' },
    { path: 'text/secondary', light: '#4B5563', dark: '#9CA3AF', scopes: ['TEXT_FILL', 'SHAPE_FILL'], web: 'var(--color-text-secondary)', android: 'colorTextSecondary', ios: 'Color.textSecondary', desc: 'Secondary labels and due dates' },
    { path: 'text/muted',     light: '#9CA3AF', dark: '#6B7280', scopes: ['TEXT_FILL', 'SHAPE_FILL'], web: 'var(--color-text-muted)',     android: 'colorTextMuted',     ios: 'Color.textMuted',     desc: 'Placeholders and disabled text' },
    { path: 'text/on-brand',  light: '#FFFFFF', dark: '#FFFFFF', scopes: ['TEXT_FILL', 'SHAPE_FILL'], web: 'var(--color-text-on-brand)',  android: 'colorTextOnBrand',  ios: 'Color.textOnBrand',  desc: 'Text and icons on primary brand backgrounds' },
    // Border & Divider
    { path: 'border/default', light: '#E5E7EB', dark: '#2E3A4E', scopes: ['STROKE_COLOR'],                             web: 'var(--color-border-default)', android: 'colorBorderDefault', ios: 'Color.borderDefault', desc: 'Default border for cards and inputs' },
    { path: 'border/focus',   light: '#0066FF', dark: '#3385FF', scopes: ['STROKE_COLOR'],                             web: 'var(--color-border-focus)',   android: 'colorBorderFocus',   ios: 'Color.borderFocus',   desc: 'Focused input border' },
    { path: 'border/divider', light: '#F3F4F6', dark: '#1F2937', scopes: ['STROKE_COLOR', 'FRAME_FILL', 'SHAPE_FILL'], web: 'var(--color-border-divider)', android: 'colorBorderDivider', ios: 'Color.borderDivider', desc: 'List divider line' },
    // Status
    { path: 'status/success',    light: '#10B981', dark: '#34D399', scopes: ['TEXT_FILL', 'SHAPE_FILL', 'FRAME_FILL', 'STROKE_COLOR'], web: 'var(--color-status-success)',    android: 'colorStatusSuccess',    ios: 'Color.statusSuccess',    desc: 'Done / completed status foreground' },
    { path: 'status/success-bg', light: '#ECFDF5', dark: '#064E3B', scopes: ['FRAME_FILL', 'SHAPE_FILL'],                               web: 'var(--color-status-success-bg)', android: 'colorStatusSuccessBg', ios: 'Color.statusSuccessBg', desc: 'Done / completed status pill background' },
    { path: 'status/warning',    light: '#F59E0B', dark: '#FBBF24', scopes: ['TEXT_FILL', 'SHAPE_FILL', 'FRAME_FILL', 'STROKE_COLOR'], web: 'var(--color-status-warning)',    android: 'colorStatusWarning',    ios: 'Color.statusWarning',    desc: 'In progress / warning status foreground' },
    { path: 'status/warning-bg', light: '#FFFBEB', dark: '#78350F', scopes: ['FRAME_FILL', 'SHAPE_FILL'],                               web: 'var(--color-status-warning-bg)', android: 'colorStatusWarningBg', ios: 'Color.statusWarningBg', desc: 'In progress / warning status pill background' },
    { path: 'status/danger',     light: '#EF4444', dark: '#F87171', scopes: ['TEXT_FILL', 'SHAPE_FILL', 'FRAME_FILL', 'STROKE_COLOR'], web: 'var(--color-status-danger)',     android: 'colorStatusDanger',     ios: 'Color.statusDanger',     desc: 'Error / danger status foreground' },
    { path: 'status/danger-bg',  light: '#FEF2F2', dark: '#7F1D1D', scopes: ['FRAME_FILL', 'SHAPE_FILL'],                               web: 'var(--color-status-danger-bg)',  android: 'colorStatusDangerBg',  ios: 'Color.statusDangerBg',  desc: 'Error / danger status pill background' }
  ];

  const expandedColors = [
    ...baseColorSpecs.map(s => ({ name: `light/${s.path}`, hex: s.light, scopes: s.scopes, web: s.web, android: s.android, ios: s.ios, desc: `[Light Mode] ${s.desc} (${s.light})` })),
    ...baseColorSpecs.map(s => ({ name: `dark/${s.path}`,  hex: s.dark,  scopes: s.scopes, web: s.web, android: s.android, ios: s.ios, desc: `[Dark Mode] ${s.desc} (${s.dark})` }))
  ];

  let allVars = await figma.variables.getLocalVariablesAsync();
  const colorTargetNames = new Set(expandedColors.map(s => s.name));
  const colorVarByName = {};
  for (const v of allVars.filter(v => v.variableCollectionId === colorColl.id)) {
    if (!colorTargetNames.has(v.name) || colorVarByName[v.name]) {
      // 移除非本次規格的殘留變數 (如預設 Color) 或同名重複變數
      v.remove();
    } else {
      colorVarByName[v.name] = v;
    }
  }

  for (const spec of expandedColors) {
    let v = colorVarByName[spec.name];
    if (!v) {
      v = figma.variables.createVariable(spec.name, colorColl, 'COLOR');
    }
    v.setValueForMode(colorModeId, hexToRgba(spec.hex));
    v.scopes = spec.scopes;
    v.description = spec.desc;
    v.setVariableCodeSyntax('WEB', spec.web);
    v.setVariableCodeSyntax('ANDROID', spec.android);
    v.setVariableCodeSyntax('iOS', spec.ios);
  }

  // ===========================================================================
  // 2. SpacingCollection (26 個 FLOAT 變數：spacing / radius / stroke / size)
  // ===========================================================================
  const updatedCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const matchingSpacingColls = updatedCollections.filter(c => c.name === 'SpacingCollection');
  let spacingColl = matchingSpacingColls[0];
  if (!spacingColl) {
    spacingColl = figma.variables.createVariableCollection('SpacingCollection');
  }
  for (let i = 1; i < matchingSpacingColls.length; i++) {
    matchingSpacingColls[i].remove();
  }
  const spacingModeId = spacingColl.modes[0].modeId;
  if (spacingColl.modes[0].name !== 'Value') {
    spacingColl.renameMode(spacingModeId, 'Value');
  }

  const spacingSpecs = [
    { name: 'spacing/none', value: 0,  scopes: ['GAP'], web: 'var(--spacing-none)', android: 'spacingNone', ios: 'Spacing.none',  desc: '0px — No spacing' },
    { name: 'spacing/2xs',  value: 2,  scopes: ['GAP'], web: 'var(--spacing-2xs)',  android: 'spacing2xs',  ios: 'Spacing.xxs',   desc: '2px — Micro gap' },
    { name: 'spacing/xs',   value: 4,  scopes: ['GAP'], web: 'var(--spacing-xs)',   android: 'spacingXs',   ios: 'Spacing.xs',    desc: '4px — Tight spacing' },
    { name: 'spacing/sm',   value: 8,  scopes: ['GAP'], web: 'var(--spacing-sm)',   android: 'spacingSm',   ios: 'Spacing.sm',    desc: '8px — Compact spacing' },
    { name: 'spacing/md',   value: 12, scopes: ['GAP'], web: 'var(--spacing-md)',   android: 'spacingMd',   ios: 'Spacing.md',    desc: '12px — Default inner gap and vertical padding' },
    { name: 'spacing/lg',   value: 16, scopes: ['GAP'], web: 'var(--spacing-lg)',   android: 'spacingLg',   ios: 'Spacing.lg',    desc: '16px — Standard card padding and screen margin' },
    { name: 'spacing/xl',   value: 20, scopes: ['GAP'], web: 'var(--spacing-xl)',   android: 'spacingXl',   ios: 'Spacing.xl',    desc: '20px — Section spacing' },
    { name: 'spacing/2xl',  value: 24, scopes: ['GAP'], web: 'var(--spacing-2xl)',  android: 'spacing2xl',  ios: 'Spacing.xxl',   desc: '24px — Bottom sheet padding' },
    { name: 'spacing/3xl',  value: 32, scopes: ['GAP'], web: 'var(--spacing-3xl)',  android: 'spacing3xl',  ios: 'Spacing.xxxl',  desc: '32px — Large section gap' },
    { name: 'spacing/4xl',  value: 48, scopes: ['GAP'], web: 'var(--spacing-4xl)',  android: 'spacing4xl',  ios: 'Spacing.xxxxl', desc: '48px — Top safe area / hero spacing' },

    { name: 'radius/none', value: 0,    scopes: ['CORNER_RADIUS'], web: 'var(--radius-none)', android: 'radiusNone', ios: 'Radius.none', desc: '0px — Sharp corners' },
    { name: 'radius/xs',   value: 4,    scopes: ['CORNER_RADIUS'], web: 'var(--radius-xs)',   android: 'radiusXs',   ios: 'Radius.xs',   desc: '4px — Small badge radius' },
    { name: 'radius/sm',   value: 8,    scopes: ['CORNER_RADIUS'], web: 'var(--radius-sm)',   android: 'radiusSm',   ios: 'Radius.sm',   desc: '8px — Compact button and input field radius' },
    { name: 'radius/md',   value: 12,   scopes: ['CORNER_RADIUS'], web: 'var(--radius-md)',   android: 'radiusMd',   ios: 'Radius.md',   desc: '12px — Standard button and card radius' },
    { name: 'radius/lg',   value: 16,   scopes: ['CORNER_RADIUS'], web: 'var(--radius-lg)',   android: 'radiusLg',   ios: 'Radius.lg',   desc: '16px — Large container radius' },
    { name: 'radius/xl',   value: 24,   scopes: ['CORNER_RADIUS'], web: 'var(--radius-xl)',   android: 'radiusXl',   ios: 'Radius.xl',   desc: '24px — Bottom sheet top radius' },
    { name: 'radius/full', value: 9999, scopes: ['CORNER_RADIUS'], web: 'var(--radius-full)', android: 'radiusFull', ios: 'Radius.full', desc: '9999px — Pill capsule radius' },

    { name: 'stroke/thin',   value: 1,   scopes: ['STROKE_FLOAT'], web: 'var(--stroke-thin)',   android: 'strokeThin',   ios: 'Stroke.thin',   desc: '1px — Default hairline border' },
    { name: 'stroke/medium', value: 1.5, scopes: ['STROKE_FLOAT'], web: 'var(--stroke-medium)', android: 'strokeMedium', ios: 'Stroke.medium', desc: '1.5px — Emphasized border' },
    { name: 'stroke/thick',  value: 2,   scopes: ['STROKE_FLOAT'], web: 'var(--stroke-thick)',  android: 'strokeThick',  ios: 'Stroke.thick',  desc: '2px — Focused input border' },

    { name: 'size/icon-sm',    value: 16, scopes: ['WIDTH_HEIGHT'], web: 'var(--size-icon-sm)',    android: 'sizeIconSm',    ios: 'Size.iconSm',    desc: '16px — Small inline status icon' },
    { name: 'size/icon-md',    value: 20, scopes: ['WIDTH_HEIGHT'], web: 'var(--size-icon-md)',    android: 'sizeIconMd',    ios: 'Size.iconMd',    desc: '20px — Standard button icon' },
    { name: 'size/icon-lg',    value: 24, scopes: ['WIDTH_HEIGHT'], web: 'var(--size-icon-lg)',    android: 'sizeIconLg',    ios: 'Size.iconLg',    desc: '24px — Primary icon size' },
    { name: 'size/control-sm', value: 36, scopes: ['WIDTH_HEIGHT'], web: 'var(--size-control-sm)', android: 'sizeControlSm', ios: 'Size.controlSm', desc: '36px — Compact button height (+ Add)' },
    { name: 'size/control-md', value: 44, scopes: ['WIDTH_HEIGHT'], web: 'var(--size-control-md)', android: 'sizeControlMd', ios: 'Size.controlMd', desc: '44px — Standard button & input height' },
    { name: 'size/control-lg', value: 52, scopes: ['WIDTH_HEIGHT'], web: 'var(--size-control-lg)', android: 'sizeControlLg', ios: 'Size.controlLg', desc: '52px — Large CTA button height (Google Login)' }
  ];

  allVars = await figma.variables.getLocalVariablesAsync();
  const spacingTargetNames = new Set(spacingSpecs.map(s => s.name));
  const spacingVarByName = {};
  for (const v of allVars.filter(v => v.variableCollectionId === spacingColl.id)) {
    if (!spacingTargetNames.has(v.name) || spacingVarByName[v.name]) {
      // 移除非本次規格的殘留變數或同名重複變數
      v.remove();
    } else {
      spacingVarByName[v.name] = v;
    }
  }

  for (const spec of spacingSpecs) {
    let v = spacingVarByName[spec.name];
    if (!v) {
      v = figma.variables.createVariable(spec.name, spacingColl, 'FLOAT');
    }
    v.setValueForMode(spacingModeId, spec.value);
    v.scopes = spec.scopes;
    v.description = spec.desc;
    v.setVariableCodeSyntax('WEB', spec.web);
    v.setVariableCodeSyntax('ANDROID', spec.android);
    v.setVariableCodeSyntax('iOS', spec.ios);
  }

  // ===========================================================================
  // 3. Text Styles (12 組字級樣式)
  // ===========================================================================
  const textStyleSpecs = [
    { name: 'Amount/Hero',   family: 'Inter', style: 'Bold',      size: 36, lineHeight: 44, letterSpacing: -1.0, description: '36/44 Bold — Hero display numeric value' },
    { name: 'Amount/Large',  family: 'Inter', style: 'Bold',      size: 28, lineHeight: 36, letterSpacing: -0.5, description: '28/36 Bold — Large numeric value' },
    { name: 'Amount/Medium', family: 'Inter', style: 'Semi Bold', size: 20, lineHeight: 28, letterSpacing: -0.2, description: '20/28 Semi Bold — Medium numeric value' },
    { name: 'Amount/Inline', family: 'Inter', style: 'Semi Bold', size: 16, lineHeight: 24, letterSpacing: 0,    description: '16/24 Semi Bold — Inline list row value' },
    { name: 'Heading/H1',    family: 'Inter', style: 'Bold',      size: 24, lineHeight: 32, letterSpacing: -0.5, description: '24/32 Bold — Screen top-level title' },
    { name: 'Heading/H2',    family: 'Inter', style: 'Semi Bold', size: 20, lineHeight: 28, letterSpacing: -0.3, description: '20/28 Semi Bold — Section header & bottom sheet title' },
    { name: 'Heading/H3',    family: 'Inter', style: 'Semi Bold', size: 17, lineHeight: 24, letterSpacing: -0.2, description: '17/24 Semi Bold — Card header' },
    { name: 'Body/Large',    family: 'Inter', style: 'Regular',   size: 16, lineHeight: 24, letterSpacing: 0,    description: '16/24 Regular — Primary body copy' },
    { name: 'Body/Medium',   family: 'Inter', style: 'Regular',   size: 14, lineHeight: 20, letterSpacing: 0,    description: '14/20 Regular — Input text and secondary copy' },
    { name: 'Label/Button',  family: 'Inter', style: 'Semi Bold', size: 16, lineHeight: 24, letterSpacing: 0,    description: '16/24 Semi Bold — Button label style' },
    { name: 'Label/Large',   family: 'Inter', style: 'Semi Bold', size: 16, lineHeight: 24, letterSpacing: 0,    description: '16/24 Semi Bold — Primary CTA button label' },
    { name: 'Label/Medium',  family: 'Inter', style: 'Medium',    size: 14, lineHeight: 20, letterSpacing: 0.1,  description: '14/20 Medium — Secondary button, cell title, field label' },
    { name: 'Caption/Small', family: 'Inter', style: 'Regular',   size: 12, lineHeight: 16, letterSpacing: 0.2,  description: '12/16 Regular — Due date and status pill text' }
  ];

  const neededFonts = new Set(textStyleSpecs.map(s => JSON.stringify({ family: s.family, style: s.style })));
  await Promise.all([...neededFonts].map(f => figma.loadFontAsync(JSON.parse(f))));

  const existingTextStyles = await figma.getLocalTextStylesAsync();
  const tsByName = {};
  for (const s of existingTextStyles) {
    if (tsByName[s.name]) {
      // 移除重複的同名 Text Style
      s.remove();
    } else {
      tsByName[s.name] = s;
    }
  }

  for (const spec of textStyleSpecs) {
    const ts = tsByName[spec.name] || figma.createTextStyle();
    ts.name = spec.name;
    ts.fontName = { family: spec.family, style: spec.style };
    ts.fontSize = spec.size;
    ts.lineHeight = { value: spec.lineHeight, unit: 'PIXELS' };
    ts.letterSpacing = { value: spec.letterSpacing, unit: 'PIXELS' };
    ts.description = spec.description;
  }

  // ===========================================================================
  // 4. Effect Styles (3 組 Elevation 外陰影樣式)
  // ===========================================================================
  const effectSpecs = [
    {
      name: 'Elevation/Card',
      description: 'Low elevation drop shadow for cards and list cells',
      effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.06 }, offset: { x: 0, y: 2 }, radius: 4, spread: 0, visible: true, blendMode: 'NORMAL' }]
    },
    {
      name: 'Elevation/Floating',
      description: 'Medium elevation drop shadow for floating action buttons and toasts',
      effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.12 }, offset: { x: 0, y: 6 }, radius: 12, spread: 0, visible: true, blendMode: 'NORMAL' }]
    },
    {
      name: 'Elevation/Modal',
      description: 'High elevation drop shadow for bottom sheets and dialogs',
      effects: [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: 0.20 }, offset: { x: 0, y: 12 }, radius: 24, spread: 0, visible: true, blendMode: 'NORMAL' }]
    }
  ];

  const existingEffects = await figma.getLocalEffectStylesAsync();
  const esByName = {};
  for (const s of existingEffects) {
    if (esByName[s.name]) {
      // 移除重複的同名 Effect Style
      s.remove();
    } else {
      esByName[s.name] = s;
    }
  }

  for (const spec of effectSpecs) {
    const es = esByName[spec.name] || figma.createEffectStyle();
    es.name = spec.name;
    es.description = spec.description;
    es.effects = spec.effects;
  }

  console.log('✅ [Phase 1: Foundations] ColorCollection (42), SpacingCollection (26), Text Styles (12), Effect Styles (3) 建立完成！');
}

async function runComponents() {
await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
  ]);

  const allVars = await figma.variables.getLocalVariablesAsync();
  const varMap = Object.fromEntries(allVars.map(v => [v.name, v]));
  const textStyles = await figma.getLocalTextStylesAsync();
  const tsMap = Object.fromEntries(textStyles.map(t => [t.name, t]));
  const effectStyles = await figma.getLocalEffectStylesAsync();
  const esMap = Object.fromEntries(effectStyles.map(e => [e.name, e]));

  function bindFill(node, varName, fallbackRgb = { r: 1, g: 1, b: 1 }) {
    const v = varMap[varName];
    const basePaint = { type: 'SOLID', color: fallbackRgb };
    node.fills = [v ? figma.variables.setBoundVariableForPaint(basePaint, 'color', v) : basePaint];
  }

  function bindStroke(node, varName, fallbackRgb = { r: 0.9, g: 0.9, b: 0.9 }) {
    const v = varMap[varName];
    const basePaint = { type: 'SOLID', color: fallbackRgb };
    node.strokes = [v ? figma.variables.setBoundVariableForPaint(basePaint, 'color', v) : basePaint];
  }

  function bindFloat(node, prop, varName, fallbackVal) {
    const v = varMap[varName];
    if (v) {
      node.setBoundVariable(prop, v);
    } else if (fallbackVal !== undefined) {
      node[prop] = fallbackVal;
    }
  }

  // 尋找或建立獨立的 "Components" Page
  let compPage = figma.root.children.find(p => p.name === 'Components');
  if (!compPage) {
    compPage = figma.createPage();
    compPage.name = 'Components';
  }

  // 清除任何誤建於其他頁面的舊版元件母體與 Icons Library (不影響畫布上的 Instance)
  const managedNames = new Set(['Icons Library', 'ToDoCellItem', 'AppButton', 'AppTextField', 'AddTaskSheet']);
  for (const page of figma.root.children) {
    if (page.id === compPage.id) continue;
    await page.loadAsync();
    for (const child of [...page.children]) {
      if (
        child.name === 'Icons Library' ||
        ((child.type === 'COMPONENT' || child.type === 'COMPONENT_SET') &&
          (managedNames.has(child.name) || child.name.startsWith('Icon/')))
      ) {
        child.remove();
      }
    }
  }

  await figma.setCurrentPageAsync(compPage);

  // 徹底清除 Components Page 上所有既有的受管元件與重複殘留節點
  for (const child of [...compPage.children]) {
    if (
      managedNames.has(child.name) ||
      child.name.startsWith('Icon/') ||
      child.name.startsWith('Status=') ||
      child.name.startsWith('Style=') ||
      child.name.startsWith('State=')
    ) {
      child.remove();
    }
  }

  // ===========================================================================
  // 1. 建立 Icons Library (20 個可重用 Icon Components)
  // ===========================================================================
  const icons = {
    'Icon/google': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`,
    'Icon/apple': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="#111827"/></svg>`,
    'Icon/mail': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    'Icon/lock': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    'Icon/eye': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>`,
    'Icon/eye-off': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`,
    'Icon/face-id': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/><path d="M12 9v4h-1"/><path d="M9.5 16a3.5 3.5 0 0 0 5 0"/></svg>`,
    'Icon/qr-scan': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="4" height="4" rx="1"/><rect x="13" y="7" width="4" height="4" rx="1"/><rect x="7" y="13" width="4" height="4" rx="1"/><path d="M13 13h4v4h-4z"/></svg>`,
    'Icon/barcode': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5v14"/><path d="M8 5v14"/><path d="M12 5v14"/><path d="M17 5v14"/><path d="M21 5v14"/></svg>`,
    'Icon/transfer': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>`,
    'Icon/top-up': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>`,
    'Icon/wallet': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`,
    'Icon/credit-card': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`,
    'Icon/bell': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    'Icon/receipt': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>`,
    'Icon/chevron-right': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
    'Icon/status-todo': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4B5563" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>`,
    'Icon/status-in-progress': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>`,
    'Icon/status-done': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
    'Icon/trash': `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`
  };

  const iconsLib = figma.createFrame();
  iconsLib.name = 'Icons Library';
  iconsLib.layoutMode = 'HORIZONTAL';
  iconsLib.layoutWrap = 'WRAP';
  iconsLib.itemSpacing = 24;
  iconsLib.counterAxisSpacing = 24;
  iconsLib.paddingTop = 24;
  iconsLib.paddingBottom = 24;
  iconsLib.paddingLeft = 24;
  iconsLib.paddingRight = 24;
  iconsLib.resize(360, 200);
  iconsLib.primaryAxisSizingMode = 'FIXED';
  iconsLib.counterAxisSizingMode = 'AUTO';
  iconsLib.x = 0;
  iconsLib.y = 0;

  const iconComps = {};
  for (const [name, svg] of Object.entries(icons)) {
    const svgFrame = figma.createNodeFromSvg(svg);
    const comp = figma.createComponentFromNode(svgFrame);
    comp.name = name;
    iconsLib.appendChild(comp);
    iconComps[name] = comp;
  }

  // ===========================================================================
  // 2. 建立 ❖ ToDoCellItem Component Set (單行：[Title + Due Date] + Spacer + [Status | Icon])
  // ===========================================================================
  const variantConfigs = [
    {
      variantName: 'Status=TODO',
      label: 'TODO',
      iconName: 'Icon/status-todo',
      btnBgVar: 'light/bg/subtle',
      btnTextVar: 'light/text/secondary',
      fallbackBg: { r: 0.933, g: 0.949, b: 0.965 },
      fallbackFg: { r: 0.294, g: 0.333, b: 0.388 }
    },
    {
      variantName: 'Status=IN PROGRESS',
      label: 'IN PROGRESS',
      iconName: 'Icon/status-in-progress',
      btnBgVar: 'light/status/warning-bg',
      btnTextVar: 'light/status/warning',
      fallbackBg: { r: 1.0, g: 0.984, b: 0.922 },
      fallbackFg: { r: 0.961, g: 0.620, b: 0.043 }
    },
    {
      variantName: 'Status=DONE',
      label: 'DONE',
      iconName: 'Icon/status-done',
      btnBgVar: 'light/status/success-bg',
      btnTextVar: 'light/status/success',
      fallbackBg: { r: 0.925, g: 0.992, b: 0.961 },
      fallbackFg: { r: 0.063, g: 0.725, b: 0.506 }
    }
  ];

  const todoVariants = [];
  for (const cfg of variantConfigs) {
    const cell = figma.createComponent();
    cell.name = cfg.variantName;
    cell.resize(361, 52);
    cell.layoutMode = 'HORIZONTAL';
    cell.primaryAxisSizingMode = 'FIXED';
    cell.counterAxisSizingMode = 'AUTO';
    cell.primaryAxisAlignItems = 'SPACE_BETWEEN';
    cell.counterAxisAlignItems = 'CENTER';

    bindFill(cell, 'light/bg/surface', { r: 1, g: 1, b: 1 });
    bindStroke(cell, 'light/border/default', { r: 0.898, g: 0.906, b: 0.922 });
    bindFloat(cell, 'strokeWeight', 'stroke/thin', 1);
    bindFloat(cell, 'topLeftRadius', 'radius/md', 12);
    bindFloat(cell, 'topRightRadius', 'radius/md', 12);
    bindFloat(cell, 'bottomLeftRadius', 'radius/md', 12);
    bindFloat(cell, 'bottomRightRadius', 'radius/md', 12);
    bindFloat(cell, 'paddingLeft', 'spacing/md', 12);
    bindFloat(cell, 'paddingRight', 'spacing/md', 12);
    bindFloat(cell, 'paddingTop', 'spacing/md', 12);
    bindFloat(cell, 'paddingBottom', 'spacing/md', 12);
    bindFloat(cell, 'itemSpacing', 'spacing/sm', 8);

    if (esMap['Elevation/Card']) {
      await cell.setEffectStyleIdAsync(esMap['Elevation/Card'].id);
    }

    const leftGroup = figma.createFrame();
    leftGroup.name = 'Title & Due Group';
    leftGroup.layoutMode = 'HORIZONTAL';
    leftGroup.primaryAxisSizingMode = 'AUTO';
    leftGroup.counterAxisSizingMode = 'AUTO';
    leftGroup.counterAxisAlignItems = 'CENTER';
    leftGroup.fills = [];
    cell.appendChild(leftGroup);
    leftGroup.layoutSizingHorizontal = 'HUG';
    leftGroup.layoutSizingVertical = 'HUG';
    bindFloat(leftGroup, 'itemSpacing', 'spacing/sm', 8);

    const titleNode = figma.createText();
    titleNode.name = 'Title';
    titleNode.fontName = { family: 'Inter', style: 'Medium' };
    titleNode.fontSize = 14;
    titleNode.characters = 'Buy groceries';
    if (tsMap['Label/Medium']) {
      await titleNode.setTextStyleIdAsync(tsMap['Label/Medium'].id);
    }
    bindFill(titleNode, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
    leftGroup.appendChild(titleNode);
    titleNode.layoutSizingHorizontal = 'HUG';

    const dueNode = figma.createText();
    dueNode.name = 'Due Date';
    dueNode.fontName = { family: 'Inter', style: 'Regular' };
    dueNode.fontSize = 12;
    dueNode.characters = 'Nov 20';
    if (tsMap['Caption/Small']) {
      await dueNode.setTextStyleIdAsync(tsMap['Caption/Small'].id);
    }
    bindFill(dueNode, 'light/text/secondary', { r: 0.294, g: 0.333, b: 0.388 });
    leftGroup.appendChild(dueNode);
    dueNode.layoutSizingHorizontal = 'HUG';

    const statusBtn = figma.createFrame();
    statusBtn.name = 'Status Button';
    statusBtn.layoutMode = 'HORIZONTAL';
    statusBtn.primaryAxisSizingMode = 'AUTO';
    statusBtn.counterAxisSizingMode = 'AUTO';
    statusBtn.primaryAxisAlignItems = 'CENTER';
    statusBtn.counterAxisAlignItems = 'CENTER';
    cell.appendChild(statusBtn);
    statusBtn.layoutSizingHorizontal = 'HUG';
    statusBtn.layoutSizingVertical = 'HUG';

    bindFill(statusBtn, cfg.btnBgVar, cfg.fallbackBg);
    bindFloat(statusBtn, 'paddingLeft', 'spacing/sm', 8);
    bindFloat(statusBtn, 'paddingRight', 'spacing/sm', 8);
    bindFloat(statusBtn, 'paddingTop', 'spacing/xs', 4);
    bindFloat(statusBtn, 'paddingBottom', 'spacing/xs', 4);
    bindFloat(statusBtn, 'itemSpacing', 'spacing/xs', 4);
    bindFloat(statusBtn, 'topLeftRadius', 'radius/full', 9999);
    bindFloat(statusBtn, 'topRightRadius', 'radius/full', 9999);
    bindFloat(statusBtn, 'bottomLeftRadius', 'radius/full', 9999);
    bindFloat(statusBtn, 'bottomRightRadius', 'radius/full', 9999);

    const statusLabel = figma.createText();
    statusLabel.name = 'Status Label';
    statusLabel.fontName = { family: 'Inter', style: 'Regular' };
    statusLabel.fontSize = 12;
    statusLabel.characters = cfg.label;
    if (tsMap['Caption/Small']) {
      await statusLabel.setTextStyleIdAsync(tsMap['Caption/Small'].id);
    }
    bindFill(statusLabel, cfg.btnTextVar, cfg.fallbackFg);
    statusBtn.appendChild(statusLabel);

    const iconInstance = iconComps[cfg.iconName].createInstance();
    iconInstance.name = 'Status Icon';
    statusBtn.appendChild(iconInstance);
    bindFloat(iconInstance, 'width', 'size/icon-sm', 16);
    bindFloat(iconInstance, 'height', 'size/icon-sm', 16);

    todoVariants.push(cell);
  }

  const todoSet = figma.combineAsVariants(todoVariants, compPage);
  todoSet.name = 'ToDoCellItem';
  todoSet.description = 'Single horizontal row ToDo item: [Title] + [Due Date] + Spacer + [Status | Icon].';
  todoSet.layoutMode = 'VERTICAL';
  todoSet.primaryAxisSizingMode = 'AUTO';
  todoSet.counterAxisSizingMode = 'AUTO';
  todoSet.itemSpacing = 12;
  todoSet.paddingTop = 20;
  todoSet.paddingBottom = 20;
  todoSet.paddingLeft = 20;
  todoSet.paddingRight = 20;

  const titlePropKey = todoSet.addComponentProperty('Title', 'TEXT', 'Buy groceries');
  const duePropKey = todoSet.addComponentProperty('Due Date', 'TEXT', 'Nov 20');
  for (const vComp of todoVariants) {
    const tNode = vComp.findOne(n => n.type === 'TEXT' && n.name === 'Title');
    const dNode = vComp.findOne(n => n.type === 'TEXT' && n.name === 'Due Date');
    if (tNode) tNode.componentPropertyReferences = { characters: titlePropKey };
    if (dNode) dNode.componentPropertyReferences = { characters: duePropKey };
  }

  // ===========================================================================
  // 3. 建立 ❖ AppButton Component Set (Style=Primary / Style=Secondary)
  // ===========================================================================
  const btnConfigs = [
    {
      name: 'Style=Primary',
      bgVar: 'light/brand/primary',
      textVar: 'light/text/on-brand',
      textStyle: 'Label/Large',
      fontStyle: 'Semi Bold',
      fontSize: 16,
      defaultLabel: 'Add Task',
      fallbackBg: { r: 0, g: 0.4, b: 1 },
      fallbackFg: { r: 1, g: 1, b: 1 }
    },
    {
      name: 'Style=Secondary',
      bgVar: 'light/bg/subtle',
      textVar: 'light/text/secondary',
      textStyle: 'Label/Medium',
      fontStyle: 'Medium',
      fontSize: 14,
      defaultLabel: 'Cancel',
      fallbackBg: { r: 0.933, g: 0.949, b: 0.965 },
      fallbackFg: { r: 0.294, g: 0.333, b: 0.388 }
    }
  ];

  const btnVariants = [];
  for (const cfg of btnConfigs) {
    const btn = figma.createComponent();
    btn.name = cfg.name;
    btn.resize(166, 44);
    btn.layoutMode = 'HORIZONTAL';
    btn.primaryAxisSizingMode = 'FIXED';
    btn.counterAxisSizingMode = 'FIXED';
    btn.primaryAxisAlignItems = 'CENTER';
    btn.counterAxisAlignItems = 'CENTER';

    bindFloat(btn, 'height', 'size/control-md', 44);
    bindFill(btn, cfg.bgVar, cfg.fallbackBg);
    bindFloat(btn, 'paddingLeft', 'spacing/lg', 16);
    bindFloat(btn, 'paddingRight', 'spacing/lg', 16);
    bindFloat(btn, 'topLeftRadius', 'radius/md', 12);
    bindFloat(btn, 'topRightRadius', 'radius/md', 12);
    bindFloat(btn, 'bottomLeftRadius', 'radius/md', 12);
    bindFloat(btn, 'bottomRightRadius', 'radius/md', 12);

    const lbl = figma.createText();
    lbl.name = 'Label';
    lbl.fontName = { family: 'Inter', style: cfg.fontStyle };
    lbl.fontSize = cfg.fontSize;
    lbl.characters = cfg.defaultLabel;
    if (tsMap[cfg.textStyle]) {
      await lbl.setTextStyleIdAsync(tsMap[cfg.textStyle].id);
    }
    bindFill(lbl, cfg.textVar, cfg.fallbackFg);
    btn.appendChild(lbl);

    btnVariants.push(btn);
  }

  const appButtonSet = figma.combineAsVariants(btnVariants, compPage);
  appButtonSet.name = 'AppButton';
  appButtonSet.description = 'Reusable button component with Style=Primary and Style=Secondary variants.';
  appButtonSet.layoutMode = 'HORIZONTAL';
  appButtonSet.primaryAxisSizingMode = 'AUTO';
  appButtonSet.counterAxisSizingMode = 'AUTO';
  appButtonSet.itemSpacing = 16;
  appButtonSet.paddingTop = 20;
  appButtonSet.paddingBottom = 20;
  appButtonSet.paddingLeft = 20;
  appButtonSet.paddingRight = 20;

  const btnLabelPropKey = appButtonSet.addComponentProperty('Label', 'TEXT', 'Add Task');
  for (const v of btnVariants) {
    const t = v.findOne(n => n.type === 'TEXT' && n.name === 'Label');
    if (t) t.componentPropertyReferences = { characters: btnLabelPropKey };
  }

  // ===========================================================================
  // 4. 建立 ❖ AppTextField Component Set (State=Default / State=Focused)
  // ===========================================================================
  const tfConfigs = [
    {
      name: 'State=Default',
      boxBgVar: 'light/bg/subtle',
      borderVar: 'light/border/default',
      strokeVar: 'stroke/thin',
      strokeVal: 1,
      textVar: 'light/text/muted',
      fallbackBg: { r: 0.933, g: 0.949, b: 0.965 },
      fallbackBorder: { r: 0.898, g: 0.906, b: 0.922 },
      fallbackText: { r: 0.612, g: 0.639, b: 0.686 }
    },
    {
      name: 'State=Focused',
      boxBgVar: 'light/bg/surface',
      borderVar: 'light/border/focus',
      strokeVar: 'stroke/thick',
      strokeVal: 2,
      textVar: 'light/text/primary',
      fallbackBg: { r: 1, g: 1, b: 1 },
      fallbackBorder: { r: 0, g: 0.4, b: 1 },
      fallbackText: { r: 0.067, g: 0.094, b: 0.153 }
    }
  ];

  const tfVariants = [];
  for (const cfg of tfConfigs) {
    const tf = figma.createComponent();
    tf.name = cfg.name;
    tf.resize(345, 68);
    tf.layoutMode = 'VERTICAL';
    tf.primaryAxisSizingMode = 'AUTO';
    tf.counterAxisSizingMode = 'FIXED';
    tf.fills = [];
    bindFloat(tf, 'itemSpacing', 'spacing/xs', 4);

    const fieldLabel = figma.createText();
    fieldLabel.name = 'Field Label';
    fieldLabel.fontName = { family: 'Inter', style: 'Medium' };
    fieldLabel.fontSize = 14;
    fieldLabel.characters = 'Task Title';
    if (tsMap['Label/Medium']) {
      await fieldLabel.setTextStyleIdAsync(tsMap['Label/Medium'].id);
    }
    bindFill(fieldLabel, 'light/text/secondary', { r: 0.294, g: 0.333, b: 0.388 });
    tf.appendChild(fieldLabel);
    fieldLabel.layoutSizingHorizontal = 'FILL';

    const inputBox = figma.createFrame();
    inputBox.name = 'Input Box';
    inputBox.layoutMode = 'HORIZONTAL';
    inputBox.primaryAxisSizingMode = 'FIXED';
    inputBox.counterAxisSizingMode = 'FIXED';
    inputBox.counterAxisAlignItems = 'CENTER';
    tf.appendChild(inputBox);
    inputBox.resize(345, 44);
    inputBox.layoutSizingHorizontal = 'FILL';
    inputBox.layoutSizingVertical = 'FIXED';
    bindFloat(inputBox, 'height', 'size/control-md', 44);
    bindFill(inputBox, cfg.boxBgVar, cfg.fallbackBg);
    bindStroke(inputBox, cfg.borderVar, cfg.fallbackBorder);
    bindFloat(inputBox, 'strokeWeight', cfg.strokeVar, cfg.strokeVal);
    bindFloat(inputBox, 'paddingLeft', 'spacing/md', 12);
    bindFloat(inputBox, 'paddingRight', 'spacing/md', 12);
    bindFloat(inputBox, 'topLeftRadius', 'radius/sm', 8);
    bindFloat(inputBox, 'topRightRadius', 'radius/sm', 8);
    bindFloat(inputBox, 'bottomLeftRadius', 'radius/sm', 8);
    bindFloat(inputBox, 'bottomRightRadius', 'radius/sm', 8);

    const inputText = figma.createText();
    inputText.name = 'Input Text';
    inputText.fontName = { family: 'Inter', style: 'Regular' };
    inputText.fontSize = 14;
    inputText.characters = 'e.g., Buy groceries';
    if (tsMap['Body/Medium']) {
      await inputText.setTextStyleIdAsync(tsMap['Body/Medium'].id);
    }
    bindFill(inputText, cfg.textVar, cfg.fallbackText);
    inputBox.appendChild(inputText);
    inputText.layoutSizingHorizontal = 'FILL';

    tfVariants.push(tf);
  }

  const appTextFieldSet = figma.combineAsVariants(tfVariants, compPage);
  appTextFieldSet.name = 'AppTextField';
  appTextFieldSet.description = 'Reusable labeled input field with State=Default and State=Focused variants.';
  appTextFieldSet.layoutMode = 'VERTICAL';
  appTextFieldSet.primaryAxisSizingMode = 'AUTO';
  appTextFieldSet.counterAxisSizingMode = 'AUTO';
  appTextFieldSet.itemSpacing = 16;
  appTextFieldSet.paddingTop = 20;
  appTextFieldSet.paddingBottom = 20;
  appTextFieldSet.paddingLeft = 20;
  appTextFieldSet.paddingRight = 20;

  const tfLabelPropKey = appTextFieldSet.addComponentProperty('Label', 'TEXT', 'Task Title');
  const tfValuePropKey = appTextFieldSet.addComponentProperty('Value', 'TEXT', 'e.g., Buy groceries');
  for (const v of tfVariants) {
    const lNode = v.findOne(n => n.type === 'TEXT' && n.name === 'Field Label');
    const vNode = v.findOne(n => n.type === 'TEXT' && n.name === 'Input Text');
    if (lNode) lNode.componentPropertyReferences = { characters: tfLabelPropKey };
    if (vNode) vNode.componentPropertyReferences = { characters: tfValuePropKey };
  }

  // ===========================================================================
  // 5. 建立 ❖ AddTaskSheet (內部嵌入 2 個 ◇ AppTextField + 2 個 ◇ AppButton Instances)
  // ===========================================================================
  const sheet = figma.createComponent();
  sheet.name = 'AddTaskSheet';
  sheet.description = 'Bottom sheet composed of AppTextField and AppButton instances.';
  sheet.resize(393, 320);
  sheet.layoutMode = 'VERTICAL';
  sheet.primaryAxisSizingMode = 'AUTO';
  sheet.counterAxisSizingMode = 'FIXED';
  sheet.counterAxisAlignItems = 'CENTER';

  bindFill(sheet, 'light/bg/elevated', { r: 1, g: 1, b: 1 });
  bindFloat(sheet, 'paddingLeft', 'spacing/2xl', 24);
  bindFloat(sheet, 'paddingRight', 'spacing/2xl', 24);
  bindFloat(sheet, 'paddingTop', 'spacing/lg', 16);
  bindFloat(sheet, 'paddingBottom', 'spacing/2xl', 24);
  bindFloat(sheet, 'itemSpacing', 'spacing/lg', 16);
  bindFloat(sheet, 'topLeftRadius', 'radius/xl', 24);
  bindFloat(sheet, 'topRightRadius', 'radius/xl', 24);
  bindFloat(sheet, 'bottomLeftRadius', 'radius/none', 0);
  bindFloat(sheet, 'bottomRightRadius', 'radius/none', 0);

  if (esMap['Elevation/Modal']) {
    await sheet.setEffectStyleIdAsync(esMap['Elevation/Modal'].id);
  }

  const grabber = figma.createFrame();
  grabber.name = 'Drag Handle';
  grabber.resize(40, 4);
  bindFill(grabber, 'light/border/default', { r: 0.898, g: 0.906, b: 0.922 });
  bindFloat(grabber, 'topLeftRadius', 'radius/full', 9999);
  bindFloat(grabber, 'topRightRadius', 'radius/full', 9999);
  bindFloat(grabber, 'bottomLeftRadius', 'radius/full', 9999);
  bindFloat(grabber, 'bottomRightRadius', 'radius/full', 9999);
  sheet.appendChild(grabber);

  const sheetTitle = figma.createText();
  sheetTitle.name = 'Sheet Title';
  sheetTitle.fontName = { family: 'Inter', style: 'Semi Bold' };
  sheetTitle.fontSize = 20;
  sheetTitle.characters = 'New Todo Item';
  if (tsMap['Heading/H2']) {
    await sheetTitle.setTextStyleIdAsync(tsMap['Heading/H2'].id);
  }
  bindFill(sheetTitle, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
  sheet.appendChild(sheetTitle);
  sheetTitle.layoutSizingHorizontal = 'FILL';

  const titleFieldInst = tfVariants[1].createInstance(); // State=Focused
  titleFieldInst.name = 'Title TextField';
  sheet.appendChild(titleFieldInst);
  titleFieldInst.layoutSizingHorizontal = 'FILL';
  titleFieldInst.setProperties({ [tfLabelPropKey]: 'Task Title', [tfValuePropKey]: 'Buy groceries' });

  const dueFieldInst = tfVariants[0].createInstance(); // State=Default
  dueFieldInst.name = 'Due Date TextField';
  sheet.appendChild(dueFieldInst);
  dueFieldInst.layoutSizingHorizontal = 'FILL';
  dueFieldInst.setProperties({ [tfLabelPropKey]: 'Due Date', [tfValuePropKey]: 'Nov 25' });

  const actionRow = figma.createFrame();
  actionRow.name = 'Action Row';
  actionRow.layoutMode = 'HORIZONTAL';
  actionRow.primaryAxisSizingMode = 'FIXED';
  actionRow.counterAxisSizingMode = 'AUTO';
  actionRow.fills = [];
  sheet.appendChild(actionRow);
  actionRow.layoutSizingHorizontal = 'FILL';
  actionRow.layoutSizingVertical = 'HUG';
  bindFloat(actionRow, 'itemSpacing', 'spacing/md', 12);

  const cancelBtnInst = btnVariants[1].createInstance(); // Style=Secondary
  cancelBtnInst.name = 'Cancel Button';
  actionRow.appendChild(cancelBtnInst);
  cancelBtnInst.layoutSizingHorizontal = 'FILL';
  cancelBtnInst.setProperties({ [btnLabelPropKey]: 'Cancel' });

  const saveBtnInst = btnVariants[0].createInstance(); // Style=Primary
  saveBtnInst.name = 'Save Button';
  actionRow.appendChild(saveBtnInst);
  saveBtnInst.layoutSizingHorizontal = 'FILL';
  saveBtnInst.setProperties({ [btnLabelPropKey]: 'Add Task' });

  // 垂直排列 Components Page 上的所有元件組
  let nextY = iconsLib.y + iconsLib.height + 40;
  for (const node of [todoSet, appButtonSet, appTextFieldSet, sheet]) {
    node.x = 0;
    node.y = nextY;
    nextY += node.height + 40;
  }

  figma.viewport.scrollAndZoomIntoView([iconsLib, todoSet, appButtonSet, appTextFieldSet, sheet]);
  console.log('✅ [Phase 2: Components] Icons Library (20), ToDoCellItem, AppButton, AppTextField, AddTaskSheet 建立完成！');
}

async function runScreen_login() {
const ctx = await createFigmaDesignerContext();

  // 從 Components Page 取得 Icon/google 母體
  const compPage = figma.root.children.find(p => p.name === 'Components');
  if (!compPage) throw new Error('Components page not found. Please run Components first!');
  await compPage.loadAsync();
  const googleIconComp = compPage.findOne(n => n.type === 'COMPONENT' && n.name === 'Icon/google');

  // 切換至 Login Page（不存在則自動建立）
  const loginPage = await ctx.getOrCreatePage('Login', ['登入']);

  // 徹底刪除既有的 Login Screen、重複畫布或空白 Frame
  for (const child of [...loginPage.children]) {
    if (
      child.name === 'Login Screen' ||
      child.name === 'Google Login Button' ||
      (child.type === 'FRAME' && child.children.length === 0)
    ) {
      child.remove();
    }
  }

  const loginScreen = figma.createFrame();
  loginScreen.name = 'Login Screen';
  loginScreen.resize(393, 852);
  loginScreen.layoutMode = 'VERTICAL';
  loginScreen.primaryAxisSizingMode = 'FIXED';
  loginScreen.counterAxisSizingMode = 'FIXED';
  loginScreen.primaryAxisAlignItems = 'CENTER';
  loginScreen.counterAxisAlignItems = 'CENTER';
  ctx.bindFill(loginScreen, 'light/bg/canvas', { r: 0.96, g: 0.97, b: 0.98 });
  ctx.bindFloat(loginScreen, 'paddingLeft', 'spacing/2xl', 24);
  ctx.bindFloat(loginScreen, 'paddingRight', 'spacing/2xl', 24);
  ctx.bindFloat(loginScreen, 'paddingTop', 'spacing/2xl', 24);
  ctx.bindFloat(loginScreen, 'paddingBottom', 'spacing/2xl', 24);
  ctx.bindFloat(loginScreen, 'itemSpacing', 'spacing/lg', 16);

  const googleBtn = figma.createFrame();
  googleBtn.name = 'Google Login Button';
  googleBtn.layoutMode = 'HORIZONTAL';
  googleBtn.primaryAxisAlignItems = 'CENTER';
  googleBtn.counterAxisAlignItems = 'CENTER';
  loginScreen.appendChild(googleBtn);
  googleBtn.resize(345, 52);
  googleBtn.layoutSizingHorizontal = 'FILL';
  googleBtn.layoutSizingVertical = 'FIXED';
  ctx.bindFloat(googleBtn, 'height', 'size/control-lg', 52);
  ctx.bindFill(googleBtn, 'light/bg/surface', { r: 1, g: 1, b: 1 });
  ctx.bindStroke(googleBtn, 'light/border/default', { r: 0.898, g: 0.906, b: 0.922 });
  ctx.bindFloat(googleBtn, 'strokeWeight', 'stroke/thin', 1);
  ctx.bindFloat(googleBtn, 'topLeftRadius', 'radius/md', 12);
  ctx.bindFloat(googleBtn, 'topRightRadius', 'radius/md', 12);
  ctx.bindFloat(googleBtn, 'bottomLeftRadius', 'radius/md', 12);
  ctx.bindFloat(googleBtn, 'bottomRightRadius', 'radius/md', 12);
  ctx.bindFloat(googleBtn, 'paddingLeft', 'spacing/lg', 16);
  ctx.bindFloat(googleBtn, 'paddingRight', 'spacing/lg', 16);
  ctx.bindFloat(googleBtn, 'itemSpacing', 'spacing/md', 12);
  await ctx.applyEffectStyle(googleBtn, 'Elevation/Card');

  if (googleIconComp) {
    const iconNode = googleIconComp.createInstance();
    iconNode.name = 'Icon/google';
    googleBtn.appendChild(iconNode);
  }

  const googleLabel = figma.createText();
  googleLabel.name = 'Label';
  googleLabel.fontName = { family: 'Inter', style: 'Semi Bold' };
  googleLabel.fontSize = 16;
  googleLabel.characters = 'Continue with Google';
  await ctx.applyTextStyle(googleLabel, 'Label/Large');
  ctx.bindFill(googleLabel, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
  googleBtn.appendChild(googleLabel);

  await ctx.cleanupEmptyPage1AndSort();
  figma.viewport.scrollAndZoomIntoView([loginScreen]);
  console.log('✅ [Screen: Login] Login Page 建立完成！');
}
async function runScreen_main() {
const ctx = await createFigmaDesignerContext();

  // 從 Components Page 取得 ToDoCellItem 與 AppButton 母體與屬性定義
  const compPage = figma.root.children.find(p => p.name === 'Components');
  if (!compPage) throw new Error('Components page not found. Please run Components first!');
  await compPage.loadAsync();

  const todoSet = compPage.children.find(n => n.type === 'COMPONENT_SET' && n.name === 'ToDoCellItem');
  if (!todoSet) throw new Error('ToDoCellItem not found on the Components page!');

  const appButtonSet = compPage.children.find(n => n.type === 'COMPONENT_SET' && n.name === 'AppButton');
  if (!appButtonSet) throw new Error('AppButton not found on the Components page!');
  const secondaryBtnVariant = appButtonSet.children.find(c => c.name === 'Style=Secondary') || appButtonSet.children[0];
  const btnLabelPropKey = Object.keys(appButtonSet.componentPropertyDefinitions || {}).find(k => k.startsWith('Label'));

  const propDefs = todoSet.componentPropertyDefinitions;
  const titlePropKey = Object.keys(propDefs).find(k => k.startsWith('Title'));
  const duePropKey = Object.keys(propDefs).find(k => k.startsWith('Due Date'));

  const todoVariant = todoSet.children.find(c => c.name === 'Status=TODO') || todoSet.children[0];
  const inProgressVariant = todoSet.children.find(c => c.name === 'Status=IN PROGRESS') || todoSet.children[1] || todoSet.children[0];
  const doneVariant = todoSet.children.find(c => c.name === 'Status=DONE') || todoSet.children[2] || todoSet.children[0];

  // 切換至 Main Page（不存在則自動建立）
  const mainPage = await ctx.getOrCreatePage('Main', ['主畫面']);

  // 徹底刪除既有的 Main Screen、重複畫布或空白 Frame
  for (const child of [...mainPage.children]) {
    if (
      child.name === 'Main Screen' ||
      child.name === 'TopNavBar' ||
      child.name === 'ListView' ||
      (child.type === 'FRAME' && child.children.length === 0)
    ) {
      child.remove();
    }
  }

  const mainScreen = figma.createFrame();
  mainScreen.name = 'Main Screen';
  mainScreen.resize(393, 852);
  mainScreen.layoutMode = 'VERTICAL';
  mainScreen.primaryAxisSizingMode = 'FIXED';
  mainScreen.counterAxisSizingMode = 'FIXED';
  ctx.bindFill(mainScreen, 'light/bg/canvas', { r: 0.96, g: 0.97, b: 0.98 });
  ctx.bindFloat(mainScreen, 'paddingLeft', 'spacing/lg', 16);
  ctx.bindFloat(mainScreen, 'paddingRight', 'spacing/lg', 16);
  ctx.bindFloat(mainScreen, 'paddingTop', 'spacing/4xl', 48);
  ctx.bindFloat(mainScreen, 'paddingBottom', 'spacing/3xl', 32);
  ctx.bindFloat(mainScreen, 'itemSpacing', 'spacing/xl', 20);

  // 頂部導覽列 TopNavBar
  const topNav = figma.createFrame();
  topNav.name = 'TopNavBar';
  topNav.layoutMode = 'HORIZONTAL';
  topNav.primaryAxisSizingMode = 'FIXED';
  topNav.counterAxisSizingMode = 'AUTO';
  topNav.primaryAxisAlignItems = 'SPACE_BETWEEN';
  topNav.counterAxisAlignItems = 'CENTER';
  topNav.fills = [];
  mainScreen.appendChild(topNav);
  topNav.layoutSizingHorizontal = 'FILL';
  topNav.layoutSizingVertical = 'HUG';

  const navTitle = figma.createText();
  navTitle.name = 'NavTitle';
  navTitle.fontName = { family: 'Inter', style: 'Bold' };
  navTitle.fontSize = 24;
  navTitle.characters = 'My Todo List';
  await ctx.applyTextStyle(navTitle, 'Heading/H1');
  ctx.bindFill(navTitle, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
  topNav.appendChild(navTitle);
  navTitle.layoutSizingHorizontal = 'HUG';

  const addBtn = figma.createFrame();
  addBtn.name = 'AddButton';
  addBtn.layoutMode = 'HORIZONTAL';
  addBtn.primaryAxisSizingMode = 'AUTO';
  addBtn.counterAxisSizingMode = 'FIXED';
  addBtn.primaryAxisAlignItems = 'CENTER';
  addBtn.counterAxisAlignItems = 'CENTER';
  topNav.appendChild(addBtn);
  addBtn.resize(76, 36);
  addBtn.layoutSizingHorizontal = 'HUG';
  addBtn.layoutSizingVertical = 'FIXED';
  ctx.bindFloat(addBtn, 'height', 'size/control-sm', 36);
  ctx.bindFill(addBtn, 'light/brand/primary', { r: 0, g: 0.4, b: 1 });
  ctx.bindFloat(addBtn, 'paddingLeft', 'spacing/md', 12);
  ctx.bindFloat(addBtn, 'paddingRight', 'spacing/md', 12);
  ctx.bindFloat(addBtn, 'topLeftRadius', 'radius/sm', 8);
  ctx.bindFloat(addBtn, 'topRightRadius', 'radius/sm', 8);
  ctx.bindFloat(addBtn, 'bottomLeftRadius', 'radius/sm', 8);
  ctx.bindFloat(addBtn, 'bottomRightRadius', 'radius/sm', 8);

  const addBtnText = figma.createText();
  addBtnText.name = 'Label';
  addBtnText.fontName = { family: 'Inter', style: 'Medium' };
  addBtnText.fontSize = 14;
  addBtnText.characters = '+ Add';
  await ctx.applyTextStyle(addBtnText, 'Label/Medium');
  ctx.bindFill(addBtnText, 'light/text/on-brand', { r: 1, g: 1, b: 1 });
  addBtn.appendChild(addBtnText);

  // ListView 容器
  const listView = figma.createFrame();
  listView.name = 'ListView';
  listView.layoutMode = 'VERTICAL';
  listView.primaryAxisSizingMode = 'FIXED';
  listView.counterAxisSizingMode = 'FIXED';
  listView.fills = [];
  mainScreen.appendChild(listView);
  listView.layoutSizingHorizontal = 'FILL';
  listView.layoutSizingVertical = 'FILL';
  ctx.bindFloat(listView, 'itemSpacing', 'spacing/md', 12);

  const rows = [
    { variant: todoVariant,       title: 'Buy groceries',            due: 'Nov 20' },
    { variant: inProgressVariant, title: 'Prepare project slides',   due: 'Nov 22' },
    { variant: doneVariant,       title: 'Book dentist appointment', due: 'Nov 18' }
  ];

  for (const row of rows) {
    const inst = row.variant.createInstance();
    inst.name = 'ToDoCellItem';
    listView.appendChild(inst);
    inst.layoutSizingHorizontal = 'FILL';

    const propsToUpdate = {};
    if (titlePropKey) propsToUpdate[titlePropKey] = row.title;
    if (duePropKey) propsToUpdate[duePropKey] = row.due;
    if (Object.keys(propsToUpdate).length > 0) {
      inst.setProperties(propsToUpdate);
    }
  }

  // 最下方 LogOut 按鈕（底部保留 spacing/3xl = 32px 間距，文字採 Label/Large + light/text/primary）
  const logoutBtn = secondaryBtnVariant.createInstance();
  logoutBtn.name = 'LogOut';
  mainScreen.appendChild(logoutBtn);
  logoutBtn.layoutSizingHorizontal = 'FILL';
  if (btnLabelPropKey) {
    logoutBtn.setProperties({ [btnLabelPropKey]: 'LogOut' });
  }
  const logoutLabelNode = logoutBtn.findOne(n => n.type === 'TEXT' && n.name === 'Label');
  if (logoutLabelNode) {
    await ctx.applyTextStyle(logoutLabelNode, 'Label/Large');
    ctx.bindFill(logoutLabelNode, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
  }

  await ctx.cleanupEmptyPage1AndSort();
  figma.viewport.scrollAndZoomIntoView([mainScreen]);
  console.log('✅ [Screen: Main] Main Page 建立完成！');
}

figma.showUI(__html__, { width: 340, height: 468, themeColors: true });

figma.ui.onmessage = async (msg) => {
  if (!msg || msg.type !== 'run') return;
  const start = Date.now();
  figma.ui.postMessage({ type: 'log', message: '🕒 code.js built at: ' + PLUGIN_BUILD_TIME });
  try {
    if (msg.target === 'foundations' || msg.target === 'all') {
      await runFoundations();
      figma.ui.postMessage({ type: 'log', message: '✅ Foundations built successfully' });
    }
    if (msg.target === 'components' || msg.target === 'all') {
      await runComponents();
      figma.ui.postMessage({ type: 'log', message: '✅ Components built successfully' });
    }
    if (msg.target === "screen:login" || msg.target === 'all') {
      await runScreen_login();
      figma.ui.postMessage({ type: 'log', message: '✅ [Screen] Login built successfully' });
    }
    if (msg.target === "screen:main" || msg.target === 'all') {
      await runScreen_main();
      figma.ui.postMessage({ type: 'log', message: '✅ [Screen] Main built successfully' });
    }
    const elapsedMs = Date.now() - start;
    figma.notify('🎉 TodoList FigmaDesigner finished (' + elapsedMs + 'ms)');
    figma.ui.postMessage({ type: 'done', elapsedMs });
  } catch (err) {
    const errMsg = (err && err.message) ? err.message : String(err);
    console.error('❌ Plugin execution error:', err);
    figma.notify('❌ Error: ' + errMsg, { error: true });
    figma.ui.postMessage({ type: 'error', message: errMsg });
  }
};
