/**
 * MCPTest Figma Design-as-Code — Phase 1: Foundations
 * ⚠️ 修改本檔後，請務必執行 `sh FigmaDesigner/build_plugin.sh` 同步更新 Figma Plugin。
 *
 * 建立或更新：
 * 1. ColorCollection (42 個 Light / Dark 語意色彩變數 + Scopes + WEB/iOS/Android Code Syntax)
 * 2. SpacingCollection (26 個 spacing / radius / stroke / size 數值變數 + Scopes + Code Syntax)
 * 3. Text Styles (12 組字級樣式)
 * 4. Effect Styles (3 組 Elevation 外陰影樣式)
 *
 * 使用方式：打開 Figma 設計稿 -> 開啟 Developer Console (Cmd + Option + J) -> 貼上執行
 */
(async () => {
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
})();
