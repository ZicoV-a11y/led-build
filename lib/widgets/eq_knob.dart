import 'dart:math' as math;

import 'package:flutter/material.dart';

/// 270° arc knob, color-coded per band, with a vertical drag
/// gesture for fine adjustment.
///
/// Visual:
///   - Full arc (background): muted grey, 270° from -135° to +135°
///   - Filled portion: from 12 o'clock, sweeping LEFT for cuts
///     (negative fillFraction) and RIGHT for boosts (positive)
///   - Tick mark inside the knob points at the current position
///
/// Interaction:
///   - Vertical drag: up = boost, down = cut. Distance is scaled so
///     the full -12..+12 range maps to ~240 logical pixels — feels
///     responsive without being twitchy
///   - Double tap: snap to 0 (handled by parent via onResetTap)
class EqKnob extends StatefulWidget {
  /// Current gain fraction in [-1, 1]. -1 = max cut, +1 = max boost.
  final double fillFraction;

  /// Whether the band is currently enabled. Disabled knobs render
  /// muted; the gesture is still active so the user can adjust
  /// before enabling.
  final bool enabled;

  /// Accent color for the arc fill + tick — green/orange/blue for
  /// low/mid/high per the spec mockup.
  final Color accentColor;

  /// Knob diameter. The arc + tick scale to fit.
  final double size;

  /// Total dB range the knob represents (typically 24 = ±12 dB).
  /// Drag arithmetic divides pixel delta by this so the same drag
  /// distance feels consistent regardless of the band's range.
  final double dbRange;

  /// Called with delta-dB per drag event. The parent translates
  /// this into setEqBandGainDb(current + delta).
  final ValueChanged<double> onDragDelta;

  /// Called on double-tap. The parent typically resets the band to
  /// 0 dB.
  final VoidCallback? onDoubleTap;

  const EqKnob({
    super.key,
    required this.fillFraction,
    required this.enabled,
    required this.accentColor,
    required this.onDragDelta,
    this.onDoubleTap,
    this.size = 120,
    this.dbRange = 24,
  });

  @override
  State<EqKnob> createState() => _EqKnobState();
}

class _EqKnobState extends State<EqKnob> {
  /// Pixels of vertical drag mapped to the full dbRange. Lower
  /// number = more sensitive (less pixel-distance per dB).
  static const double _pixelsForFullRange = 240;

  @override
  Widget build(BuildContext context) {
    final accent = widget.enabled
        ? widget.accentColor
        : widget.accentColor.withValues(alpha: 0.32);
    final bg = widget.enabled
        ? const Color(0xFF222227)
        : const Color(0xFF1A1A1F);
    final track = widget.enabled
        ? const Color(0xFF333339)
        : const Color(0xFF26262B);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onDoubleTap: widget.onDoubleTap,
      onVerticalDragUpdate: (d) {
        // Up (negative dy) = boost. Down (positive dy) = cut.
        final deltaDb =
            -d.delta.dy * (widget.dbRange / _pixelsForFullRange);
        widget.onDragDelta(deltaDb);
      },
      child: SizedBox(
        width: widget.size,
        height: widget.size,
        child: CustomPaint(
          painter: _KnobPainter(
            fillFraction: widget.fillFraction.clamp(-1.0, 1.0),
            accent: accent,
            background: bg,
            track: track,
          ),
        ),
      ),
    );
  }
}

class _KnobPainter extends CustomPainter {
  final double fillFraction;
  final Color accent;
  final Color background;
  final Color track;

  // 270° arc, from -135° (SW, pointing down-left) to +135° (SE).
  // Anchored to 12 o'clock (-90°) for the visual zero — fill grows
  // LEFT for cuts, RIGHT for boosts, mirroring the mockup.
  static const double _arcStartAngle = math.pi * 3 / 4; // 135°
  static const double _arcSweep = math.pi * 3 / 2; // 270°
  static const double _topAngle = -math.pi / 2; // 12 o'clock

  _KnobPainter({
    required this.fillFraction,
    required this.accent,
    required this.background,
    required this.track,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    // Outer ring (filled circle for the knob body backdrop).
    canvas.drawCircle(center, radius, Paint()..color = background);

    // Track arc (always full, muted). Symmetric 270° sweep with the
    // 90° gap centered on 6 o'clock — starts at 7:30 (135°) and
    // ends at 4:30 (45° after wrap). Before this fix, the start
    // was 6 o'clock (90°) → gap was 3-6 o'clock only, making the
    // knob visibly asymmetric (BOOST side had less track visible
    // than CUT side).
    final trackPaint = Paint()
      ..color = track
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    final arcRect = Rect.fromCircle(
      center: center,
      radius: radius - 6,
    );
    canvas.drawArc(
      arcRect,
      _arcStartAngle, // 135° = 7:30 position
      _arcSweep, // 270° CW → ends at 4:30
      false,
      trackPaint,
    );

    // Fill arc — sweeps from 12 o'clock left or right based on sign.
    if (fillFraction.abs() > 0.01) {
      final fillPaint = Paint()
        ..color = accent
        ..style = PaintingStyle.stroke
        ..strokeWidth = 5
        ..strokeCap = StrokeCap.round;
      // Per-side max sweep is 135° (half of 270°).
      final sweep = (math.pi * 3 / 4) * fillFraction;
      final start = sweep < 0 ? _topAngle + sweep : _topAngle;
      canvas.drawArc(arcRect, start, sweep.abs(), false, fillPaint);
    }

    // Inner knob disk — slightly inset, gives the visual "weight" of
    // the mockup. Drop shadow approximated with a darker circle
    // behind the main fill.
    canvas.drawCircle(
      center,
      radius - 14,
      Paint()..color = const Color(0xFF181819),
    );
    canvas.drawCircle(
      center,
      radius - 16,
      Paint()..color = const Color(0xFF2A2A30),
    );

    // Tick mark — points from center toward the current arc
    // position. Always visible (even at 0) so the user has a focal
    // point.
    final tickAngle = _topAngle + (math.pi * 3 / 4) * fillFraction;
    final tickInner = Offset(
      center.dx + (radius - 26) * math.cos(tickAngle),
      center.dy + (radius - 26) * math.sin(tickAngle),
    );
    final tickOuter = Offset(
      center.dx + (radius - 16) * math.cos(tickAngle),
      center.dy + (radius - 16) * math.sin(tickAngle),
    );
    final tickPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.92)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5
      ..strokeCap = StrokeCap.round;
    canvas.drawLine(tickInner, tickOuter, tickPaint);
  }

  @override
  bool shouldRepaint(_KnobPainter old) {
    return old.fillFraction != fillFraction ||
        old.accent != accent ||
        old.background != background ||
        old.track != track;
  }
}
