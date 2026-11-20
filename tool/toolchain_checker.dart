import 'dart:convert';
import 'dart:io';

/// 語意化版本解析與比對工具。
abstract class Semver {
  /// 檢查 [actual] 是否大於等於 [min]。
  static bool satisfiesMin(String actual, String min) {
    final aParts = _parseParts(actual);
    final mParts = _parseParts(min);
    if (aParts.isEmpty || mParts.isEmpty) return false;
    for (var i = 0; i < 3; i++) {
      final a = i < aParts.length ? aParts[i] : 0;
      final m = i < mParts.length ? mParts[i] : 0;
      if (a > m) return true;
      if (a < m) return false;
    }
    return true;
  }

  /// 解析主版本號（例如 "17.0.19" ➔ 17，"1.8.0" ➔ 8）。
  static int parseMajor(String version) {
    final parts = _parseParts(version);
    if (parts.isEmpty) return 0;
    if (parts[0] == 1 && parts.length > 1) {
      return parts[1];
    }
    return parts[0];
  }

  static List<int> _parseParts(String v) {
    final clean = v.replaceAll(RegExp(r'^[^\d]*'), '');
    final match = RegExp(r'^(\d+)(?:\.(\d+))?(?:\.(\d+))?').firstMatch(clean);
    if (match == null) return const [];
    return [
      int.parse(match.group(1)!),
      if (match.group(2) != null) int.parse(match.group(2)!),
      if (match.group(3) != null) int.parse(match.group(3)!),
    ];
  }
}

/// Java 版本資訊。
class JavaVersionInfo {
  const JavaVersionInfo({required this.major, required this.raw});
  final int major;
  final String raw;
}

/// 環境探針介面（便於單元測試替換）。
abstract class EnvironmentProbe {
  Future<String?> getMacOsVersion();
  Future<String?> getXcodeVersion();
  Future<String?> getSwiftVersion();
  Future<String?> getCocoaPodsVersion();
  Future<String?> getFlutterVersion();
  Future<String?> getDartVersion();
  Future<JavaVersionInfo?> getJavaVersion();
  Future<String?> getGradleWrapperVersion();
  Future<bool> hasAndroidWrapperFiles();
  Future<String?> getAndroidSdkPath();
  Future<List<int>> getInstalledAndroidPlatforms(String sdkPath);
  Future<List<String>> getInstalledNdks(String sdkPath);
}

/// 真實系統環境探針（以 Process.run 與檔案系統檢測）。
class SystemEnvironmentProbe implements EnvironmentProbe {
  const SystemEnvironmentProbe();

  @override
  Future<String?> getMacOsVersion() async {
    if (!Platform.isMacOS) return null;
    try {
      final res = await Process.run('sw_vers', ['-productVersion']);
      if (res.exitCode == 0) {
        return (res.stdout as String).trim();
      }
    } catch (_) {}
    return null;
  }

  @override
  Future<String?> getXcodeVersion() async {
    if (!Platform.isMacOS) return null;
    try {
      final res = await Process.run('xcodebuild', ['-version']);
      if (res.exitCode == 0) {
        final match = RegExp(r'Xcode\s+([\d.]+)').firstMatch(res.stdout as String);
        return match?.group(1);
      }
    } catch (_) {}
    return null;
  }

  @override
  Future<String?> getSwiftVersion() async {
    if (!Platform.isMacOS) return null;
    try {
      final res = await Process.run('swift', ['--version']);
      final output = '${res.stdout} ${res.stderr}';
      final match = RegExp(r'Apple Swift version\s+([\d.]+)').firstMatch(output);
      return match?.group(1);
    } catch (_) {}
    return null;
  }

  @override
  Future<String?> getCocoaPodsVersion() async {
    if (!Platform.isMacOS) return null;
    try {
      final res = await Process.run('pod', ['--version']);
      if (res.exitCode == 0) {
        final ver = (res.stdout as String).trim();
        if (RegExp(r'^\d+\.\d+').hasMatch(ver)) return ver;
      }
    } catch (_) {}

    // 備援：部分受限沙盒環境不允許 Ruby 讀取 /etc/resolv.conf，改讀 Homebrew Cellar 目錄版本
    final cellar = Directory('/opt/homebrew/Cellar/cocoapods');
    if (await cellar.exists()) {
      try {
        final entries = await cellar
            .list()
            .where((e) => e is Directory)
            .map((e) => e.uri.pathSegments.reversed.skip(1).first.split('_').first)
            .toList();
        if (entries.isNotEmpty) {
          entries.sort();
          return entries.last;
        }
      } catch (_) {}
    }
    return null;
  }

  @override
  Future<String?> getFlutterVersion() async {
    try {
      final res = await Process.run('flutter', ['--version', '--machine'], runInShell: true);
      if (res.exitCode == 0) {
        final data = jsonDecode(res.stdout as String) as Map<String, dynamic>;
        return data['frameworkVersion'] as String?;
      }
    } catch (_) {}

    // 備援：若 flutter CLI 無法寫入 cache stamp（例如唯讀沙盒），改讀 flutter.version.json
    const candidateJsonPaths = [
      '/opt/homebrew/share/flutter/bin/cache/flutter.version.json',
    ];
    for (final path in candidateJsonPaths) {
      final f = File(path);
      if (await f.exists()) {
        try {
          final data = jsonDecode(await f.readAsString()) as Map<String, dynamic>;
          return (data['frameworkVersion'] ?? data['flutterVersion']) as String?;
        } catch (_) {}
      }
    }
    return null;
  }

  @override
  Future<String?> getDartVersion() async {
    final vmMatch = RegExp(r'^(\d+\.\d+\.\d+)').firstMatch(Platform.version);
    if (vmMatch != null) return vmMatch.group(1);

    try {
      final res = await Process.run('dart', ['--version'], runInShell: true);
      final output = '${res.stdout} ${res.stderr}';
      final match = RegExp(r'version:\s*(\d+\.\d+\.\d+)').firstMatch(output);
      return match?.group(1);
    } catch (_) {}
    return null;
  }

  @override
  Future<JavaVersionInfo?> getJavaVersion() async {
    final candidateExecutables = <String>[
      'java',
      if (Platform.environment['JAVA_HOME'] != null)
        '${Platform.environment['JAVA_HOME']}${Platform.pathSeparator}bin${Platform.pathSeparator}java',
      if (Platform.isWindows)
        r'C:\Program Files\Android\Android Studio\jbr\bin\java.exe',
      if (Platform.isMacOS)
        '/Applications/Android Studio.app/Contents/jbr/Contents/Home/bin/java',
      if (Platform.isLinux)
        '/opt/android-studio/jbr/bin/java',
    ];

    for (final exe in candidateExecutables) {
      try {
        final res = await Process.run(exe, ['-version'], runInShell: true);
        final output = '${res.stdout} ${res.stderr}';
        final match = RegExp(r'version\s+"([^"]+)"').firstMatch(output);
        if (match != null) {
          final raw = match.group(1)!;
          return JavaVersionInfo(major: Semver.parseMajor(raw), raw: raw);
        }
      } catch (_) {}
    }
    return null;
  }

  static const _wrapperPaths = [
    'Android/gradle/wrapper/gradle-wrapper.properties',
    'Flutter/android/gradle/wrapper/gradle-wrapper.properties',
  ];

  @override
  Future<bool> hasAndroidWrapperFiles() async {
    for (final path in _wrapperPaths) {
      if (await File(path).exists()) return true;
    }
    return false;
  }

  @override
  Future<String?> getGradleWrapperVersion() async {
    for (final path in _wrapperPaths) {
      final wrapper = File(path);
      if (await wrapper.exists()) {
        final text = await wrapper.readAsString();
        final match = RegExp(r'gradle-([\d.]+)-').firstMatch(text);
        if (match != null) return match.group(1);
      }
    }
    return null;
  }

  @override
  Future<String?> getAndroidSdkPath() async {
    final envPath = Platform.environment['ANDROID_HOME'] ?? Platform.environment['ANDROID_SDK_ROOT'];
    if (envPath != null && await Directory(envPath).exists()) return envPath;

    if (Platform.isWindows) {
      final localApp = Platform.environment['LOCALAPPDATA'];
      if (localApp != null) {
        final defaultPath = '$localApp\\Android\\Sdk';
        if (await Directory(defaultPath).exists()) return defaultPath;
      }
    } else if (Platform.isMacOS) {
      final home = Platform.environment['HOME'];
      if (home != null) {
        final defaultPath = '$home/Library/Android/sdk';
        if (await Directory(defaultPath).exists()) return defaultPath;
      }
    } else if (Platform.isLinux) {
      final home = Platform.environment['HOME'];
      if (home != null) {
        final defaultPath = '$home/Android/Sdk';
        if (await Directory(defaultPath).exists()) return defaultPath;
      }
    }
    return null;
  }

  @override
  Future<List<int>> getInstalledAndroidPlatforms(String sdkPath) async {
    final platformsDir = Directory('$sdkPath${Platform.pathSeparator}platforms');
    if (!await platformsDir.exists()) return const [];
    try {
      final versions = <int>[];
      await for (final entity in platformsDir.list()) {
        if (entity is Directory) {
          final name = entity.uri.pathSegments.reversed.skip(1).first;
          final match = RegExp(r'^android-(\d+)').firstMatch(name);
          if (match != null) {
            versions.add(int.parse(match.group(1)!));
          }
        }
      }
      versions.sort();
      return versions.toSet().toList()..sort();
    } catch (_) {
      return const [];
    }
  }

  @override
  Future<List<String>> getInstalledNdks(String sdkPath) async {
    final ndkDir = Directory('$sdkPath${Platform.pathSeparator}ndk');
    if (!await ndkDir.exists()) return const [];
    try {
      final list = <String>[];
      await for (final entity in ndkDir.list()) {
        if (entity is Directory) {
          list.add(entity.uri.pathSegments.reversed.skip(1).first);
        }
      }
      return list;
    } catch (_) {
      return const [];
    }
  }
}

/// toolchain.json 規格模型。
class ToolchainSpec {
  const ToolchainSpec({
    required this.macosMin,
    required this.xcodeMin,
    required this.swiftMin,
    required this.cocoapodsMin,
    required this.flutterMin,
    required this.dartMin,
    required this.javaMin,
    required this.gradleMin,
    required this.minCompileSdk,
    required this.ndkRequired,
  });

  factory ToolchainSpec.fromJson(Map<String, dynamic> json) {
    final tc = (json['toolchain'] as Map<String, dynamic>?) ?? json;
    final macos = (tc['macos'] as Map<String, dynamic>?) ?? {};
    final xcode = (tc['xcode'] as Map<String, dynamic>?) ?? {};
    final swift = (tc['swift'] as Map<String, dynamic>?) ?? {};
    final cocoapods = (tc['cocoapods'] as Map<String, dynamic>?) ?? {};
    final flutter = (tc['flutter'] as Map<String, dynamic>?) ?? {};
    final dart = (tc['dart'] as Map<String, dynamic>?) ?? {};
    final java = (tc['java'] as Map<String, dynamic>?) ?? {};
    final gradle = (tc['gradle'] as Map<String, dynamic>?) ?? {};
    final androidSdk = (tc['androidSdk'] as Map<String, dynamic>?) ?? {};
    final ndk = (tc['androidNdk'] as Map<String, dynamic>?) ?? {};

    return ToolchainSpec(
      macosMin: (macos['minVersion'] as String?) ?? '26.0',
      xcodeMin: (xcode['minVersion'] as String?) ?? '26.0',
      swiftMin: (swift['minVersion'] as String?) ?? '6.0',
      cocoapodsMin: (cocoapods['minVersion'] as String?) ?? '1.16.0',
      flutterMin: (flutter['minVersion'] as String?) ?? '3.41.0',
      dartMin: (dart['minVersion'] as String?) ?? '3.11.0',
      javaMin: (java['minVersion'] as num?)?.toInt() ?? 17,
      gradleMin: (gradle['minVersion'] as String?) ?? '9.0.0',
      minCompileSdk: (androidSdk['minCompileSdk'] as num?)?.toInt() ?? 34,
      ndkRequired: (ndk['requiredVersion'] as String?) ?? '28.2.13676358',
    );
  }

  final String macosMin;
  final String xcodeMin;
  final String swiftMin;
  final String cocoapodsMin;
  final String flutterMin;
  final String dartMin;
  final int javaMin;
  final String gradleMin;
  final int minCompileSdk;
  final String ndkRequired;
}

/// 單項環境檢查結果。
class CheckItemResult {
  const CheckItemResult({
    required this.label,
    required this.isSuccess,
    required this.detected,
    required this.expected,
    this.remediation,
  });

  final String label;
  final bool isSuccess;
  final String detected;
  final String expected;
  final String? remediation;
}

/// 綜合預檢報告。
class ToolchainReport {
  const ToolchainReport(this.results);
  final List<CheckItemResult> results;

  bool get passed => results.every((r) => r.isSuccess);
  List<CheckItemResult> get failures => results.where((r) => !r.isSuccess).toList();
}

/// Toolchain 預檢執行器。
class ToolchainChecker {
  const ToolchainChecker({required this.spec, required this.probe});

  final ToolchainSpec spec;
  final EnvironmentProbe probe;

  Future<ToolchainReport> checkAll() async {
    final results = <CheckItemResult>[];

    // 1. Apple 平台工具鏈（僅在 macOS 主機檢查）
    if (Platform.isMacOS) {
      final macos = await probe.getMacOsVersion();
      final macosOk = macos != null && Semver.satisfiesMin(macos, spec.macosMin);
      results.add(CheckItemResult(
        label: 'macOS',
        isSuccess: macosOk,
        detected: macos ?? '未偵測到',
        expected: '>= ${spec.macosMin}',
        remediation: macosOk ? null : '請將 macOS 升級至 >= ${spec.macosMin}',
      ));

      final xcode = await probe.getXcodeVersion();
      final xcodeOk = xcode != null && Semver.satisfiesMin(xcode, spec.xcodeMin);
      results.add(CheckItemResult(
        label: 'Xcode',
        isSuccess: xcodeOk,
        detected: xcode ?? '未偵測到',
        expected: '>= ${spec.xcodeMin}',
        remediation: xcodeOk ? null : '請安裝 Xcode >= ${spec.xcodeMin} 並確認 xcode-select 路徑',
      ));

      final swift = await probe.getSwiftVersion();
      final swiftOk = swift != null && Semver.satisfiesMin(swift, spec.swiftMin);
      results.add(CheckItemResult(
        label: 'Swift',
        isSuccess: swiftOk,
        detected: swift ?? '未偵測到',
        expected: '>= ${spec.swiftMin}',
        remediation: swiftOk ? null : '請確認 Xcode Command Line Tools 提供的 Swift >= ${spec.swiftMin}',
      ));

      final pods = await probe.getCocoaPodsVersion();
      final podsOk = pods != null && Semver.satisfiesMin(pods, spec.cocoapodsMin);
      results.add(CheckItemResult(
        label: 'CocoaPods',
        isSuccess: podsOk,
        detected: pods ?? '未偵測到',
        expected: '>= ${spec.cocoapodsMin}',
        remediation: podsOk ? null : '請安裝 CocoaPods >= ${spec.cocoapodsMin} (brew install cocoapods)',
      ));
    }

    // 2. Flutter & Dart
    final flutter = await probe.getFlutterVersion();
    final flutterOk = flutter != null && Semver.satisfiesMin(flutter, spec.flutterMin);
    results.add(CheckItemResult(
      label: 'Flutter SDK',
      isSuccess: flutterOk,
      detected: flutter ?? '未偵測到',
      expected: '>= ${spec.flutterMin}',
      remediation: flutterOk ? null : '請安裝 Flutter >= ${spec.flutterMin} (stable)',
    ));

    final dart = await probe.getDartVersion();
    final dartOk = dart != null && Semver.satisfiesMin(dart, spec.dartMin);
    results.add(CheckItemResult(
      label: 'Dart SDK',
      isSuccess: dartOk,
      detected: dart ?? '未偵測到',
      expected: '>= ${spec.dartMin}',
      remediation: dartOk ? null : '請確認 Dart SDK >= ${spec.dartMin} 已加入 PATH',
    ));

    // 3. Java JDK
    final java = await probe.getJavaVersion();
    final javaOk = java != null && java.major >= spec.javaMin;
    results.add(CheckItemResult(
      label: 'Java / JDK',
      isSuccess: javaOk,
      detected: java?.raw ?? '未偵測到',
      expected: '>= ${spec.javaMin}',
      remediation: javaOk ? null : '請安裝 JDK >= ${spec.javaMin} (例如 OpenJDK 17 / 21) 並設定 JAVA_HOME',
    ));

    // 4. Gradle Wrapper（若專案已初始化 Android/ 或 Flutter/android/ 則強制檢查版本）
    final hasWrapper = await probe.hasAndroidWrapperFiles();
    if (hasWrapper) {
      final gradle = await probe.getGradleWrapperVersion();
      final gradleOk = gradle != null && Semver.satisfiesMin(gradle, spec.gradleMin);
      results.add(CheckItemResult(
        label: 'Gradle Wrapper',
        isSuccess: gradleOk,
        detected: gradle ?? '未解析到版本',
        expected: '>= ${spec.gradleMin}',
        remediation: gradleOk ? null : '請更新 gradle-wrapper.properties 至 Gradle >= ${spec.gradleMin}',
      ));
    } else {
      results.add(CheckItemResult(
        label: 'Gradle Wrapper',
        isSuccess: true,
        detected: '尚未初始化 Android / Flutter 專案（略過）',
        expected: '建立專案後須 >= ${spec.gradleMin}',
      ));
    }

    // 5. Android SDK & NDK
    final sdkPath = await probe.getAndroidSdkPath();
    final platforms = sdkPath != null ? await probe.getInstalledAndroidPlatforms(sdkPath) : <int>[];
    final maxPlatform = platforms.isNotEmpty ? platforms.last : null;
    final sdkOk = maxPlatform != null && maxPlatform >= spec.minCompileSdk;
    results.add(CheckItemResult(
      label: 'Android SDK',
      isSuccess: sdkOk,
      detected: maxPlatform != null ? 'android-$maxPlatform (path: $sdkPath)' : '未偵測到或無權限存取',
      expected: '>= android-${spec.minCompileSdk}',
      remediation: sdkOk ? null : '請確認 ANDROID_HOME / ~/Library/Android/sdk 已安裝 android-${spec.minCompileSdk} 以上平台',
    ));

    final ndks = sdkPath != null ? await probe.getInstalledNdks(sdkPath) : <String>[];
    final ndkOk = ndks.contains(spec.ndkRequired);
    results.add(CheckItemResult(
      label: 'Android NDK',
      isSuccess: ndkOk,
      detected: ndkOk ? spec.ndkRequired : (ndks.isEmpty ? '未偵測到或未安裝' : ndks.join(', ')),
      expected: spec.ndkRequired,
      remediation: ndkOk ? null : '請透過 Android SDK Manager / android CLI 安裝 NDK ${spec.ndkRequired}',
    ));

    return ToolchainReport(results);
  }
}
