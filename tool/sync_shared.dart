import 'dart:io';

/// 每次平台建置／打包前，從 shared/ 與 FigmaDesigner/assets/icons/ 拷貝最新資源至各平台目錄。
Future<void> main(List<String> args) async {
  final root = Directory.current;

  Future<void> copyFileIfTargetParentExists(String srcRel, String dstRel) async {
    final src = File('${root.path}/$srcRel');
    final dst = File('${root.path}/$dstRel');
    if (!await src.exists()) {
      stderr.writeln('[WARN] 找不到來源檔案: $srcRel');
      return;
    }
    if (!await dst.parent.exists()) return;
    await src.copy(dst.path);
  }

  Future<void> copyDirIfPlatformExists(
    String platformRootRel,
    String srcDirRel,
    String dstDirRel, {
    required String ext,
  }) async {
    final platformRoot = Directory('${root.path}/$platformRootRel');
    if (!await platformRoot.exists()) return;

    final srcDir = Directory('${root.path}/$srcDirRel');
    if (!await srcDir.exists()) return;

    final dstDir = Directory('${root.path}/$dstDirRel');
    if (!await dstDir.exists()) {
      await dstDir.create(recursive: true);
    }

    await for (final entity in srcDir.list()) {
      if (entity is File && entity.path.endsWith(ext)) {
        final name = entity.uri.pathSegments.last;
        await entity.copy('${dstDir.path}/$name');
      }
    }
  }

  // 1. 同步 Firebase 設定檔 (shared/firebase/)
  await copyFileIfTargetParentExists(
    'shared/firebase/google-services.json',
    'Android/app/google-services.json',
  );
  await copyFileIfTargetParentExists(
    'shared/firebase/GoogleService-Info.plist',
    'iOS/MCPTest/Resources/GoogleService-Info.plist',
  );

  // 2. 同步 Lottie 動畫資產 (shared/animations/*.json)
  await copyDirIfPlatformExists(
    'Android/app',
    'shared/animations',
    'Android/app/src/main/assets/animations',
    ext: '.json',
  );
  await copyDirIfPlatformExists(
    'iOS/MCPTest',
    'shared/animations',
    'iOS/MCPTest/Resources/Animations',
    ext: '.json',
  );

  // 3. 同步 SVG 向量圖示 (FigmaDesigner/assets/icons/*.svg)
  await copyDirIfPlatformExists(
    'Android/app',
    'FigmaDesigner/assets/icons',
    'Android/app/src/main/assets/icons',
    ext: '.svg',
  );
  await copyDirIfPlatformExists(
    'iOS/MCPTest',
    'FigmaDesigner/assets/icons',
    'iOS/MCPTest/Resources/Icons',
    ext: '.svg',
  );

  stdout.writeln('✅ 已從 shared/ 與 FigmaDesigner/assets/icons/ 同步最新資源至各平台目錄。');
}
