/**
 * Screen: Setting
 * ⚠️ 修改本檔後，請務必執行 `sh FigmaDesigner/build_plugin.sh` 同步更新 Figma Plugin。
 *
 * 負責建構 `Setting` Page (`Setting Screen` 393×852)：
 * - `TopNavBar`：左側 `NavTitle` ("Settings")
 * - `Profile Card`：顯示 Google 帳號登入資訊（`◇ Icon/google` + 帳號標題與信箱）
 * - `Preferences Section`：設定群組卡片（Notifications、Appearance、App Version，複用 `Icons Library`）
 * - 底部配置 `BottomActions`：即時時間標籤 (`LiveTimeLabel`, `yyyy-MM-dd HH:mm:ss`, `Caption/Small`, `light/text/muted`) 與下方 `LogOut` 按鈕（間距 `spacing/2xl`，底部間距 `spacing/3xl`）
 */
(async () => {
  const ctx = await createFigmaDesignerContext();

  // 從 Components Page 取得共用元件與 Icons Library 母體
  const compPage = figma.root.children.find(p => p.name === 'Components');
  if (!compPage) throw new Error('找不到 Components Page，請先執行 Components！');
  await compPage.loadAsync();

  const appButtonSet = compPage.children.find(n => n.type === 'COMPONENT_SET' && n.name === 'AppButton');
  if (!appButtonSet) throw new Error('在 Components Page 找不到 AppButton！');
  const secondaryBtnVariant = appButtonSet.children.find(c => c.name === 'Style=Secondary') || appButtonSet.children[0];
  const btnLabelPropKey = Object.keys(appButtonSet.componentPropertyDefinitions || {}).find(k => k.startsWith('Label'));

  function findIcon(name) {
    return compPage.findOne(n => n.type === 'COMPONENT' && n.name === name);
  }

  // 切換至共用 Screens Page（Starter 雙頁架構：Screens + Components）
  const screensPage = await ctx.getOrCreateScreensPage();

  // 冪等清理：徹底刪除既有的 Setting Screen、舊版殘留容器或空白 Frame
  for (const child of [...screensPage.children]) {
    if (
      child.name === 'Setting Screen' ||
      child.name === 'Profile Card' ||
      child.name === 'Preferences Section' ||
      child.name === 'BottomActions' ||
      (child.type === 'FRAME' && child.children.length === 0)
    ) {
      child.remove();
    }
  }

  // 外層 Setting Screen (393 × 852, Vertical Auto Layout)
  const settingScreen = figma.createFrame();
  settingScreen.name = 'Setting Screen';
  settingScreen.resize(393, 852);
  settingScreen.layoutMode = 'VERTICAL';
  settingScreen.primaryAxisSizingMode = 'FIXED';
  settingScreen.counterAxisSizingMode = 'FIXED';
  ctx.bindFill(settingScreen, 'light/bg/canvas', { r: 0.96, g: 0.97, b: 0.98 });
  ctx.bindFloat(settingScreen, 'paddingLeft', 'spacing/lg', 16);
  ctx.bindFloat(settingScreen, 'paddingRight', 'spacing/lg', 16);
  ctx.bindFloat(settingScreen, 'paddingTop', 'spacing/4xl', 48);
  ctx.bindFloat(settingScreen, 'paddingBottom', 'spacing/3xl', 32);
  ctx.bindFloat(settingScreen, 'itemSpacing', 'spacing/xl', 20);
  ctx.placeScreenOnCanvas(screensPage, settingScreen, 2);

  // 1. 頂部導覽列 TopNavBar
  const topNav = figma.createFrame();
  topNav.name = 'TopNavBar';
  topNav.layoutMode = 'HORIZONTAL';
  topNav.primaryAxisSizingMode = 'FIXED';
  topNav.counterAxisSizingMode = 'AUTO';
  topNav.primaryAxisAlignItems = 'SPACE_BETWEEN';
  topNav.counterAxisAlignItems = 'CENTER';
  topNav.fills = [];
  settingScreen.appendChild(topNav);
  topNav.layoutSizingHorizontal = 'FILL';
  topNav.layoutSizingVertical = 'HUG';

  const navTitle = figma.createText();
  navTitle.name = 'NavTitle';
  navTitle.fontName = { family: 'Inter', style: 'Bold' };
  navTitle.fontSize = 24;
  navTitle.characters = 'Settings';
  await ctx.applyTextStyle(navTitle, 'Heading/H1');
  ctx.bindFill(navTitle, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
  topNav.appendChild(navTitle);
  navTitle.layoutSizingHorizontal = 'HUG';

  // 2. 帳號資訊卡片 Profile Card
  const profileCard = figma.createFrame();
  profileCard.name = 'Profile Card';
  profileCard.layoutMode = 'HORIZONTAL';
  profileCard.primaryAxisSizingMode = 'FIXED';
  profileCard.counterAxisSizingMode = 'AUTO';
  profileCard.counterAxisAlignItems = 'CENTER';
  settingScreen.appendChild(profileCard);
  profileCard.layoutSizingHorizontal = 'FILL';
  profileCard.layoutSizingVertical = 'HUG';
  ctx.bindFill(profileCard, 'light/bg/surface', { r: 1, g: 1, b: 1 });
  ctx.bindStroke(profileCard, 'light/border/default', { r: 0.898, g: 0.906, b: 0.922 });
  ctx.bindFloat(profileCard, 'strokeWeight', 'stroke/thin', 1);
  ctx.bindFloat(profileCard, 'topLeftRadius', 'radius/md', 12);
  ctx.bindFloat(profileCard, 'topRightRadius', 'radius/md', 12);
  ctx.bindFloat(profileCard, 'bottomLeftRadius', 'radius/md', 12);
  ctx.bindFloat(profileCard, 'bottomRightRadius', 'radius/md', 12);
  ctx.bindFloat(profileCard, 'paddingLeft', 'spacing/lg', 16);
  ctx.bindFloat(profileCard, 'paddingRight', 'spacing/lg', 16);
  ctx.bindFloat(profileCard, 'paddingTop', 'spacing/lg', 16);
  ctx.bindFloat(profileCard, 'paddingBottom', 'spacing/lg', 16);
  ctx.bindFloat(profileCard, 'itemSpacing', 'spacing/md', 12);
  await ctx.applyEffectStyle(profileCard, 'Elevation/Card');

  const avatarBadge = figma.createFrame();
  avatarBadge.name = 'Avatar Badge';
  avatarBadge.layoutMode = 'HORIZONTAL';
  avatarBadge.primaryAxisSizingMode = 'FIXED';
  avatarBadge.counterAxisSizingMode = 'FIXED';
  avatarBadge.primaryAxisAlignItems = 'CENTER';
  avatarBadge.counterAxisAlignItems = 'CENTER';
  avatarBadge.resize(44, 44);
  ctx.bindFill(avatarBadge, 'light/brand/secondary', { r: 0.902, g: 0.941, b: 1 });
  ctx.bindFloat(avatarBadge, 'width', 'size/control-md', 44);
  ctx.bindFloat(avatarBadge, 'height', 'size/control-md', 44);
  ctx.bindFloat(avatarBadge, 'topLeftRadius', 'radius/full', 9999);
  ctx.bindFloat(avatarBadge, 'topRightRadius', 'radius/full', 9999);
  ctx.bindFloat(avatarBadge, 'bottomLeftRadius', 'radius/full', 9999);
  ctx.bindFloat(avatarBadge, 'bottomRightRadius', 'radius/full', 9999);
  profileCard.appendChild(avatarBadge);

  const googleIconComp = findIcon('Icon/google');
  if (googleIconComp) {
    const iconNode = googleIconComp.createInstance();
    iconNode.name = 'Icon/google';
    avatarBadge.appendChild(iconNode);
    ctx.bindFloat(iconNode, 'width', 'size/icon-md', 20);
    ctx.bindFloat(iconNode, 'height', 'size/icon-md', 20);
  }

  const accountInfo = figma.createFrame();
  accountInfo.name = 'Account Info';
  accountInfo.layoutMode = 'VERTICAL';
  accountInfo.primaryAxisSizingMode = 'AUTO';
  accountInfo.counterAxisSizingMode = 'FIXED';
  accountInfo.fills = [];
  profileCard.appendChild(accountInfo);
  accountInfo.layoutSizingHorizontal = 'FILL';
  accountInfo.layoutSizingVertical = 'HUG';
  ctx.bindFloat(accountInfo, 'itemSpacing', 'spacing/2xs', 2);

  const accountTitle = figma.createText();
  accountTitle.name = 'Account Title';
  accountTitle.fontName = { family: 'Inter', style: 'Semi Bold' };
  accountTitle.fontSize = 16;
  accountTitle.characters = 'Signed in with Google';
  await ctx.applyTextStyle(accountTitle, 'Label/Large');
  ctx.bindFill(accountTitle, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
  accountInfo.appendChild(accountTitle);
  accountTitle.layoutSizingHorizontal = 'FILL';

  const accountEmail = figma.createText();
  accountEmail.name = 'Account Email';
  accountEmail.fontName = { family: 'Inter', style: 'Regular' };
  accountEmail.fontSize = 14;
  accountEmail.characters = 'user@example.com';
  await ctx.applyTextStyle(accountEmail, 'Body/Medium');
  ctx.bindFill(accountEmail, 'light/text/secondary', { r: 0.294, g: 0.333, b: 0.388 });
  accountInfo.appendChild(accountEmail);
  accountEmail.layoutSizingHorizontal = 'FILL';

  // 3. Preferences 區塊（垂直撐滿剩餘空間，讓底部 LogOut 對齊底部）
  const prefSection = figma.createFrame();
  prefSection.name = 'Preferences Section';
  prefSection.layoutMode = 'VERTICAL';
  prefSection.primaryAxisSizingMode = 'FIXED';
  prefSection.counterAxisSizingMode = 'FIXED';
  prefSection.fills = [];
  settingScreen.appendChild(prefSection);
  prefSection.layoutSizingHorizontal = 'FILL';
  prefSection.layoutSizingVertical = 'FILL';
  ctx.bindFloat(prefSection, 'itemSpacing', 'spacing/sm', 8);

  const prefHeader = figma.createText();
  prefHeader.name = 'Section Header';
  prefHeader.fontName = { family: 'Inter', style: 'Medium' };
  prefHeader.fontSize = 14;
  prefHeader.characters = 'Preferences';
  await ctx.applyTextStyle(prefHeader, 'Label/Medium');
  ctx.bindFill(prefHeader, 'light/text/secondary', { r: 0.294, g: 0.333, b: 0.388 });
  prefSection.appendChild(prefHeader);
  prefHeader.layoutSizingHorizontal = 'FILL';

  const prefGroupCard = figma.createFrame();
  prefGroupCard.name = 'Preferences Card';
  prefGroupCard.layoutMode = 'VERTICAL';
  prefGroupCard.primaryAxisSizingMode = 'AUTO';
  prefGroupCard.counterAxisSizingMode = 'FIXED';
  prefSection.appendChild(prefGroupCard);
  prefGroupCard.layoutSizingHorizontal = 'FILL';
  prefGroupCard.layoutSizingVertical = 'HUG';
  ctx.bindFill(prefGroupCard, 'light/bg/surface', { r: 1, g: 1, b: 1 });
  ctx.bindStroke(prefGroupCard, 'light/border/default', { r: 0.898, g: 0.906, b: 0.922 });
  ctx.bindFloat(prefGroupCard, 'strokeWeight', 'stroke/thin', 1);
  ctx.bindFloat(prefGroupCard, 'topLeftRadius', 'radius/md', 12);
  ctx.bindFloat(prefGroupCard, 'topRightRadius', 'radius/md', 12);
  ctx.bindFloat(prefGroupCard, 'bottomLeftRadius', 'radius/md', 12);
  ctx.bindFloat(prefGroupCard, 'bottomRightRadius', 'radius/md', 12);
  await ctx.applyEffectStyle(prefGroupCard, 'Elevation/Card');

  const chevronComp = findIcon('Icon/chevron-right');

  async function appendSettingRow({ name, iconName, title, valueText, badgeText, showChevron, isLast }) {
    const row = figma.createFrame();
    row.name = name;
    row.layoutMode = 'HORIZONTAL';
    row.primaryAxisSizingMode = 'FIXED';
    row.counterAxisSizingMode = 'AUTO';
    row.primaryAxisAlignItems = 'SPACE_BETWEEN';
    row.counterAxisAlignItems = 'CENTER';
    row.fills = [];
    prefGroupCard.appendChild(row);
    row.layoutSizingHorizontal = 'FILL';
    row.layoutSizingVertical = 'HUG';
    ctx.bindFloat(row, 'paddingLeft', 'spacing/lg', 16);
    ctx.bindFloat(row, 'paddingRight', 'spacing/lg', 16);
    ctx.bindFloat(row, 'paddingTop', 'spacing/md', 12);
    ctx.bindFloat(row, 'paddingBottom', 'spacing/md', 12);
    ctx.bindFloat(row, 'itemSpacing', 'spacing/md', 12);

    const left = figma.createFrame();
    left.name = 'Left Group';
    left.layoutMode = 'HORIZONTAL';
    left.primaryAxisSizingMode = 'AUTO';
    left.counterAxisSizingMode = 'AUTO';
    left.counterAxisAlignItems = 'CENTER';
    left.fills = [];
    row.appendChild(left);
    left.layoutSizingHorizontal = 'HUG';
    left.layoutSizingVertical = 'HUG';
    ctx.bindFloat(left, 'itemSpacing', 'spacing/md', 12);

    const iconComp = findIcon(iconName);
    if (iconComp) {
      const iconInst = iconComp.createInstance();
      iconInst.name = iconName;
      left.appendChild(iconInst);
      ctx.bindFloat(iconInst, 'width', 'size/icon-md', 20);
      ctx.bindFloat(iconInst, 'height', 'size/icon-md', 20);
    }

    const rowTitle = figma.createText();
    rowTitle.name = 'Row Title';
    rowTitle.fontName = { family: 'Inter', style: 'Regular' };
    rowTitle.fontSize = 16;
    rowTitle.characters = title;
    await ctx.applyTextStyle(rowTitle, 'Body/Large');
    ctx.bindFill(rowTitle, 'light/text/primary', { r: 0.067, g: 0.094, b: 0.153 });
    left.appendChild(rowTitle);
    rowTitle.layoutSizingHorizontal = 'HUG';

    const right = figma.createFrame();
    right.name = 'Right Group';
    right.layoutMode = 'HORIZONTAL';
    right.primaryAxisSizingMode = 'AUTO';
    right.counterAxisSizingMode = 'AUTO';
    right.counterAxisAlignItems = 'CENTER';
    right.fills = [];
    row.appendChild(right);
    right.layoutSizingHorizontal = 'HUG';
    right.layoutSizingVertical = 'HUG';
    ctx.bindFloat(right, 'itemSpacing', 'spacing/sm', 8);

    if (badgeText) {
      const badge = figma.createFrame();
      badge.name = 'Status Badge';
      badge.layoutMode = 'HORIZONTAL';
      badge.primaryAxisSizingMode = 'AUTO';
      badge.counterAxisSizingMode = 'AUTO';
      badge.primaryAxisAlignItems = 'CENTER';
      badge.counterAxisAlignItems = 'CENTER';
      right.appendChild(badge);
      badge.layoutSizingHorizontal = 'HUG';
      badge.layoutSizingVertical = 'HUG';
      ctx.bindFill(badge, 'light/status/success-bg', { r: 0.925, g: 0.992, b: 0.961 });
      ctx.bindFloat(badge, 'paddingLeft', 'spacing/sm', 8);
      ctx.bindFloat(badge, 'paddingRight', 'spacing/sm', 8);
      ctx.bindFloat(badge, 'paddingTop', 'spacing/xs', 4);
      ctx.bindFloat(badge, 'paddingBottom', 'spacing/xs', 4);
      ctx.bindFloat(badge, 'topLeftRadius', 'radius/full', 9999);
      ctx.bindFloat(badge, 'topRightRadius', 'radius/full', 9999);
      ctx.bindFloat(badge, 'bottomLeftRadius', 'radius/full', 9999);
      ctx.bindFloat(badge, 'bottomRightRadius', 'radius/full', 9999);

      const badgeLabel = figma.createText();
      badgeLabel.name = 'Badge Label';
      badgeLabel.fontName = { family: 'Inter', style: 'Regular' };
      badgeLabel.fontSize = 12;
      badgeLabel.characters = badgeText;
      await ctx.applyTextStyle(badgeLabel, 'Caption/Small');
      ctx.bindFill(badgeLabel, 'light/status/success', { r: 0.063, g: 0.725, b: 0.506 });
      badge.appendChild(badgeLabel);
    } else if (valueText) {
      const valueNode = figma.createText();
      valueNode.name = 'Row Value';
      valueNode.fontName = { family: 'Inter', style: 'Regular' };
      valueNode.fontSize = 14;
      valueNode.characters = valueText;
      await ctx.applyTextStyle(valueNode, 'Body/Medium');
      ctx.bindFill(valueNode, 'light/text/secondary', { r: 0.294, g: 0.333, b: 0.388 });
      right.appendChild(valueNode);
    }

    if (showChevron && chevronComp) {
      const chevInst = chevronComp.createInstance();
      chevInst.name = 'Icon/chevron-right';
      right.appendChild(chevInst);
      ctx.bindFloat(chevInst, 'width', 'size/icon-sm', 16);
      ctx.bindFloat(chevInst, 'height', 'size/icon-sm', 16);
    }

    if (!isLast) {
      const divider = figma.createFrame();
      divider.name = 'Divider';
      divider.resize(329, 1);
      prefGroupCard.appendChild(divider);
      divider.layoutSizingHorizontal = 'FILL';
      divider.layoutSizingVertical = 'FIXED';
      ctx.bindFill(divider, 'light/border/divider', { r: 0.953, g: 0.957, b: 0.965 });
      ctx.bindFloat(divider, 'height', 'stroke/thin', 1);
    }
  }

  await appendSettingRow({
    name: 'Notifications Row',
    iconName: 'Icon/bell',
    title: 'Push Notifications',
    badgeText: 'On',
    showChevron: true,
    isLast: false
  });
  await appendSettingRow({
    name: 'Appearance Row',
    iconName: 'Icon/eye',
    title: 'Appearance',
    valueText: 'System',
    showChevron: true,
    isLast: false
  });
  await appendSettingRow({
    name: 'Version Row',
    iconName: 'Icon/receipt',
    title: 'App Version',
    valueText: 'v1.0.0',
    showChevron: false,
    isLast: true
  });

  // 4. 底部操作區 BottomActions：即時時間標籤 + LogOut 按鈕（間距 spacing/2xl = 24px）
  const bottomActions = figma.createFrame();
  bottomActions.name = 'BottomActions';
  bottomActions.layoutMode = 'VERTICAL';
  bottomActions.primaryAxisSizingMode = 'AUTO';
  bottomActions.counterAxisSizingMode = 'FIXED';
  bottomActions.counterAxisAlignItems = 'CENTER';
  bottomActions.fills = [];
  settingScreen.appendChild(bottomActions);
  bottomActions.layoutSizingHorizontal = 'FILL';
  bottomActions.layoutSizingVertical = 'HUG';
  ctx.bindFloat(bottomActions, 'itemSpacing', 'spacing/2xl', 24);

  const liveTimeLabel = figma.createText();
  liveTimeLabel.name = 'LiveTimeLabel';
  liveTimeLabel.fontName = { family: 'Inter', style: 'Regular' };
  liveTimeLabel.fontSize = 12;
  liveTimeLabel.characters = '2026-11-24 14:25:38';
  liveTimeLabel.textAlignHorizontal = 'CENTER';
  await ctx.applyTextStyle(liveTimeLabel, 'Caption/Small');
  ctx.bindFill(liveTimeLabel, 'light/text/muted', { r: 0.612, g: 0.639, b: 0.686 });
  bottomActions.appendChild(liveTimeLabel);
  liveTimeLabel.layoutSizingHorizontal = 'FILL';

  const logoutBtn = secondaryBtnVariant.createInstance();
  logoutBtn.name = 'LogOut';
  bottomActions.appendChild(logoutBtn);
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
  figma.viewport.scrollAndZoomIntoView([settingScreen]);
  console.log('✅ [Screen: Setting] Setting Page 建立完成！');
})();
