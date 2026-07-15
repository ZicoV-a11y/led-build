import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../theme/app_theme.dart';

/// Where releases are hosted. When you set up the GitHub repo (or
/// move to a different host), change **just this line** — the About
/// dialog's `Check for updates` button opens whatever URL is here in
/// the user's default browser.
///
/// GitHub Releases URLs look like:
///   `https://github.com/USER/REPO/releases`
/// The user always sees "current version installed" and can click to
/// download whatever's newest on that page.
const String kReleasesUrl =
    'https://github.com/ZicoV-a11y/DIG/releases';

/// Current app version, hardcoded here so the About dialog can show
/// it without a package_info_plus dependency. Update this + the
/// `version:` line in pubspec.yaml together whenever you cut a
/// release.
const String kAppVersion = '2.1.0+3';

/// Simple About / update dialog. Opens from the info button in the
/// folder sidebar's bottom row. Zero infrastructure — clicking
/// **Check for updates** just launches [kReleasesUrl] in the user's
/// default browser. They see the releases page + decide whether to
/// download.
Future<void> showAppAboutDialog(BuildContext context) async {
  await showDialog<void>(
    context: context,
    builder: (_) => const _AppAboutDialog(),
  );
}

class _AppAboutDialog extends StatelessWidget {
  const _AppAboutDialog();

  Future<void> _openReleases(BuildContext context) async {
    final uri = Uri.parse(kReleasesUrl);
    try {
      final ok = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!context.mounted) return;
      if (!ok) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(
          SnackBar(
            content: Text('Could not open $kReleasesUrl'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.maybeOf(context)?.showSnackBar(
        SnackBar(
          content: Text('Failed to open browser: $e'),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: AppColors.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(6),
        side: const BorderSide(color: AppColors.border),
      ),
      child: Container(
        width: 400,
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.library_music_rounded,
                    size: 22, color: AppColors.accent),
                const SizedBox(width: 8),
                const Text(
                  'Music Tracker',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                IconButton(
                  iconSize: 16,
                  splashRadius: 14,
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 24, minHeight: 24),
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded,
                      color: AppColors.textSecondary),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'Version $kAppVersion',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                fontFeatures: [FontFeature.tabularFigures()],
              ),
            ),
            const SizedBox(height: 18),
            const Text(
              'A DJ digging workstation. Table-centric, keyboard-'
                  'first, momentum-preserving.',
              style: TextStyle(
                color: AppColors.textSecondary,
                fontSize: 12,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.symmetric(
                  horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: AppColors.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'UPDATES',
                    style: TextStyle(
                      color: AppColors.textTertiary,
                      fontSize: 10,
                      letterSpacing: 1.2,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Check the Releases page for the latest version. '
                        'Download the newer zip if one is available, '
                        'unzip, and replace the app in your '
                        'Applications folder.',
                    style: TextStyle(
                      color: AppColors.textSecondary,
                      fontSize: 12,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: FilledButton.icon(
                      onPressed: () => _openReleases(context),
                      icon: const Icon(Icons.open_in_new_rounded,
                          size: 14),
                      label: const Text('Check for updates'),
                      style: FilledButton.styleFrom(
                        backgroundColor: AppColors.accent,
                        foregroundColor: AppColors.textPrimary,
                        textStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 8),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
