/**
 * MCPTest Figma Design-as-Code — Phase 2: Components Page & Reusable UI Components
 * ⚠️ 修改本檔後，請務必執行 `sh FigmaDesigner/build_plugin.sh` 同步更新 Figma Plugin。
 *
 * 於獨立的 `Components` Page 建立或更新：
 * 1. Icons Library (20 個標準向量 ❖ Icon/* Components，對應本地 assets/icons/*.svg)
 * 2. ❖ ToDoCellItem Component Set (單行水平排列：[Title + Due Date (gap: 8)] + Spacer + [Status | Icon]，3 種 Status Variants)
 * 3. ❖ AppButton Component Set (Style=Primary / Style=Secondary)
 * 4. ❖ AppTextField Component Set (State=Default / State=Focused)
 * 5. ❖ AddTaskSheet Component (內部以 2 個 ◇ AppTextField + 2 個 ◇ AppButton Instances 組裝)
 *
 * 前置條件：請先執行 `foundations.js`
 */
(async () => {
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
})();
