/**
 * Screen: Login
 * ⚠️ 修改本檔後，請務必執行 `sh FigmaDesigner/build_plugin.sh` 同步更新 Figma Plugin。
 *
 * 負責建構 `Login` Page (`Login Screen` 393×852)：
 * - 畫面正中心配置 `Google Login Button`（高 size/control-lg = 52px，圓角 radius/md = 12px）
 * - 內嵌 `Components` Page 的 `◇ Icon/google` Instance 與 `"Continue with Google"`
 */
(async () => {
  const ctx = await createFigmaDesignerContext();

  // 從 Components Page 取得 Icon/google 母體
  const compPage = figma.root.children.find(p => p.name === 'Components');
  if (!compPage) throw new Error('找不到 Components Page，請先執行 Components！');
  await compPage.loadAsync();
  const googleIconComp = compPage.findOne(n => n.type === 'COMPONENT' && n.name === 'Icon/google');

  // 切換至共用 Screens Page（Starter 雙頁架構：Screens + Components）
  const screensPage = await ctx.getOrCreateScreensPage();

  // 徹底刪除既有的 Login Screen、重複畫布或空白 Frame
  for (const child of [...screensPage.children]) {
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
  ctx.placeScreenOnCanvas(screensPage, loginScreen, 0);
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
})();
