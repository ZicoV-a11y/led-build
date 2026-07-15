import 'package:flutter/material.dart';

import '../models/eq_state.dart';
import '../state/library_controller.dart';
import '../theme/app_theme.dart';
import 'eq_knob.dart';

/// 3-band shelving EQ panel — LOW / MID / HIGH columns with
/// power-toggle, knob, dB readout, and ± stepper. Mirrors the spec
/// mockup the user provided. UI-only as of slice 1; the audio
/// engine isn't yet wired to the values (see [LibraryController]
/// for the doctrine).
///
/// Mount as a floating overlay in [HomeScreen]'s Stack; the
/// PlaybackBar exposes the toggle button that flips
/// `controller.eqPanelOpen`.
class EqPanel extends StatelessWidget {
  final LibraryController controller;
  final VoidCallback? onClose;

  const EqPanel({
    super.key,
    required this.controller,
    this.onClose,
  });

  static const Color _accentLow = Color(0xFF4ADE80); // green
  static const Color _accentMid = Color(0xFFFB923C); // orange
  static const Color _accentHigh = Color(0xFF60A5FA); // blue

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: ValueListenableBuilder<EqState>(
        valueListenable: controller.eqStateListenable,
        builder: (context, eq, _) {
          return Container(
            width: 520,
            decoration: BoxDecoration(
              color: const Color(0xFF101013),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(
                color: AppColors.border,
                width: 1,
              ),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x99000000),
                  blurRadius: 24,
                  offset: Offset(0, 8),
                ),
              ],
            ),
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Header(controller: controller, onClose: onClose),
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: _BandColumn(
                        controller: controller,
                        band: EqBand.low,
                        label: 'LOW',
                        state: eq.low,
                        accent: _accentLow,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: _BandColumn(
                        controller: controller,
                        band: EqBand.mid,
                        label: 'MID',
                        state: eq.mid,
                        accent: _accentMid,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: _BandColumn(
                        controller: controller,
                        band: EqBand.high,
                        label: 'HIGH',
                        state: eq.high,
                        accent: _accentHigh,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const _ActivateHint(),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final LibraryController controller;
  final VoidCallback? onClose;
  const _Header({required this.controller, this.onClose});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Icon(
          Icons.tune_rounded,
          size: 14,
          color: AppColors.textSecondary,
        ),
        const SizedBox(width: 6),
        const Text(
          'EQ',
          style: TextStyle(
            color: AppColors.textPrimary,
            fontSize: 13,
            fontWeight: FontWeight.w700,
            letterSpacing: 1.0,
          ),
        ),
        const Spacer(),
        TextButton.icon(
          onPressed: controller.resetEq,
          icon: const Icon(
            Icons.refresh_rounded,
            size: 12,
            color: AppColors.textSecondary,
          ),
          label: const Text(
            'Reset',
            style: TextStyle(
              color: AppColors.textSecondary,
              fontSize: 11,
            ),
          ),
          style: TextButton.styleFrom(
            padding:
                const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(3),
              side: const BorderSide(color: AppColors.border),
            ),
          ),
        ),
        if (onClose != null) ...[
          const SizedBox(width: 4),
          IconButton(
            iconSize: 14,
            splashRadius: 12,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 24, minHeight: 24),
            tooltip: 'Close',
            icon: const Icon(
              Icons.close_rounded,
              color: AppColors.textSecondary,
            ),
            onPressed: onClose,
          ),
        ],
      ],
    );
  }
}

class _BandColumn extends StatelessWidget {
  final LibraryController controller;
  final EqBand band;
  final String label;
  final EqBandState state;
  final Color accent;

  const _BandColumn({
    required this.controller,
    required this.band,
    required this.label,
    required this.state,
    required this.accent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 10, 8, 8),
      decoration: BoxDecoration(
        color: const Color(0xFF17171B),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: const Color(0xFF222227),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              color: state.enabled
                  ? AppColors.textPrimary
                  : AppColors.textSecondary,
              fontSize: 11,
              letterSpacing: 1.4,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          _PowerButton(
            enabled: state.enabled,
            accent: accent,
            onPressed: () => controller.setEqBandEnabled(
              band,
              !state.enabled,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'CUT',
                style: TextStyle(
                  color: state.enabled
                      ? AppColors.textSecondary
                      : AppColors.textTertiary,
                  fontSize: 9,
                  letterSpacing: 1.0,
                ),
              ),
              Text(
                'BOOST',
                style: TextStyle(
                  color: state.enabled
                      ? AppColors.textSecondary
                      : AppColors.textTertiary,
                  fontSize: 9,
                  letterSpacing: 1.0,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          EqKnob(
            fillFraction: state.fillFraction,
            enabled: state.enabled,
            accentColor: accent,
            size: 84,
            onDragDelta: (delta) =>
                controller.stepEqBandGainDb(band, delta),
            onDoubleTap: () =>
                controller.setEqBandGainDb(band, 0),
          ),
          const SizedBox(height: 8),
          Text(
            state.formattedDb,
            style: TextStyle(
              color: state.enabled ? accent : AppColors.textTertiary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 8),
          _Stepper(
            accent: accent,
            enabled: state.enabled,
            value: state.gainDb,
            onMinus: () => controller.stepEqBandGainDb(band, -1),
            onZero: () => controller.setEqBandGainDb(band, 0),
            onPlus: () => controller.stepEqBandGainDb(band, 1),
          ),
        ],
      ),
    );
  }
}

class _PowerButton extends StatelessWidget {
  final bool enabled;
  final Color accent;
  final VoidCallback onPressed;

  const _PowerButton({
    required this.enabled,
    required this.accent,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(4),
        child: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: const Color(0xFF1E1E22),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(
              color: enabled ? accent : const Color(0xFF333339),
              width: 1.5,
            ),
          ),
          child: Icon(
            Icons.power_settings_new_rounded,
            color: enabled ? accent : AppColors.textTertiary,
            size: 16,
          ),
        ),
      ),
    );
  }
}

class _Stepper extends StatelessWidget {
  final Color accent;
  final bool enabled;
  final double value;
  final VoidCallback onMinus;
  final VoidCallback onZero;
  final VoidCallback onPlus;

  const _Stepper({
    required this.accent,
    required this.enabled,
    required this.value,
    required this.onMinus,
    required this.onZero,
    required this.onPlus,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _StepButton(
            icon: Icons.remove_rounded,
            accent: enabled ? accent : AppColors.textTertiary,
            onPressed: onMinus,
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          flex: 2,
          child: _StepButton(
            label: '0',
            accent: enabled
                ? AppColors.textSecondary
                : AppColors.textTertiary,
            onPressed: onZero,
          ),
        ),
        const SizedBox(width: 4),
        Expanded(
          child: _StepButton(
            icon: Icons.add_rounded,
            accent: enabled ? accent : AppColors.textTertiary,
            onPressed: onPressed,
          ),
        ),
      ],
    );
  }

  VoidCallback get onPressed => onPlus;
}

class _StepButton extends StatelessWidget {
  final IconData? icon;
  final String? label;
  final Color accent;
  final VoidCallback onPressed;

  const _StepButton({
    this.icon,
    this.label,
    required this.accent,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(3),
        child: Container(
          height: 22,
          decoration: BoxDecoration(
            color: const Color(0xFF1A1A1E),
            borderRadius: BorderRadius.circular(3),
            border: Border.all(
              color: const Color(0xFF26262B),
              width: 1,
            ),
          ),
          alignment: Alignment.center,
          child: icon != null
              ? Icon(icon, size: 12, color: accent)
              : Text(
                  label ?? '',
                  style: TextStyle(
                    color: accent,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
        ),
      ),
    );
  }
}

class _ActivateHint extends StatelessWidget {
  const _ActivateHint();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF17171B),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        children: const [
          Icon(
            Icons.lightbulb_outline_rounded,
            size: 11,
            color: AppColors.textTertiary,
          ),
          SizedBox(width: 6),
          Expanded(
            child: Text(
              'Click power button to activate band. '
                  'Drag the knob to adjust; double-tap to reset.',
              style: TextStyle(
                color: AppColors.textTertiary,
                fontSize: 10,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
