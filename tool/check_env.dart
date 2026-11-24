import 'dart:convert';
import 'dart:io';

import 'toolchain_checker.dart';

TargetPlatform _parsePlatform(List<String> args) {
  String? raw;
  for (var i = 0; i < args.length; i++) {
    final arg = args[i];
    if (arg == '--platform' && i + 1 < args.length) {
      raw = args[i + 1];
      break;
    }
    if (arg.startsWith('--platform=')) {
      raw = arg.substring('--platform='.length);
      break;
    }
  }
  switch (raw?.toLowerCase()) {
    case null:
    case 'all':
      return TargetPlatform.all;
    case 'android':
      return TargetPlatform.android;
    case 'ios':
      return TargetPlatform.ios;
    default:
      stderr.writeln('\x1B[31m[ERROR] 不支援的 --platform 參數：$raw（僅支援 android / ios / all）\x1B[0m');
      exit(2);
  }
}

Future<void> main(List<String> args) async {
  final platform = _parsePlatform(args);

  // 尋找根目錄的 toolchain.json
  File? configFile;
  for (final path in ['toolchain.json', '../toolchain.json']) {
    final f = File(path);
    if (await f.exists()) {
      configFile = f;
      break;
    }
  }

  if (configFile == null) {
    stderr.writeln('\x1B[31m[ERROR] 找不到專案根目錄之 toolchain.json 規格設定檔！\x1B[0m');
    exit(1);
  }

  final specJson = jsonDecode(await configFile.readAsString()) as Map<String, dynamic>;
  final spec = ToolchainSpec.fromJson(specJson);

  stdout.writeln('====================================================');
  stdout.writeln('   TodoList Toolchain 環境預檢報告 (target: ${platform.name})');
  stdout.writeln('====================================================');

  final checker = ToolchainChecker(
    spec: spec,
    probe: const SystemEnvironmentProbe(),
    platform: platform,
  );
  final report = await checker.checkAll();

  for (final item in report.results) {
    if (item.isSuccess) {
      stdout.writeln('\x1B[32m[✓]\x1B[0m ${item.label.padRight(16)}: ${item.detected} (符合 ${item.expected})');
    } else {
      stdout.writeln('\x1B[31m[✗]\x1B[0m ${item.label.padRight(16)}: ${item.detected} (規格要求: ${item.expected})');
      if (item.remediation != null) {
        stdout.writeln('    \x1B[33m➜ 修復指引：${item.remediation}\x1B[0m');
      }
    }
  }

  stdout.writeln('----------------------------------------------------');
  if (report.passed) {
    stdout.writeln('\x1B[32m🎉 環境全數符合規格，可正常進行雙平台開發與建置！\x1B[0m');
    stdout.writeln('====================================================');
    exit(0);
  } else {
    stdout.writeln('\x1B[31m❌ 檢查未通過：共 ${report.failures.length} 項環境設定需要調整，請依上方修復指引處理。\x1B[0m');
    stdout.writeln('====================================================');
    exit(1);
  }
}
