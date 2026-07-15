import 'dart:math' as math;

/// Per-band EQ state for the 3-band shelving EQ surface (low / mid /
/// high). UI-only as of slice 1 (2026-06-07) — knob values persist
/// and are visible across launches, but the audio engine
/// (`just_audio`) has no EQ DSP, so the values don't yet shape the
/// sound. Slice 2 swaps the engine and wires the values to a real
/// filter chain.
class EqBandState {
  /// User-toggled band-enable. The audio side respects this when it
  /// exists; the UI dims the band's visual state when false.
  final bool enabled;

  /// Gain in dB. Clamped to [_minGainDb, _maxGainDb] on every
  /// mutation so the knob's visual mapping (`gainDb / maxGainDb`)
  /// stays in [-1, +1].
  final double gainDb;

  static const double minGainDb = -12.0;
  static const double maxGainDb = 12.0;

  const EqBandState({
    this.enabled = false,
    this.gainDb = 0.0,
  });

  /// Default state for a fresh band — disabled, flat.
  static const EqBandState defaults = EqBandState();

  EqBandState copyWith({bool? enabled, double? gainDb}) {
    return EqBandState(
      enabled: enabled ?? this.enabled,
      gainDb: gainDb == null
          ? this.gainDb
          : gainDb.clamp(minGainDb, maxGainDb).toDouble(),
    );
  }

  /// Visual fill fraction for the knob arc, in [-1, 1].
  double get fillFraction {
    final clamped = gainDb.clamp(minGainDb, maxGainDb).toDouble();
    return clamped / maxGainDb;
  }

  /// Human label like `+3.0 dB` / `0 dB` / `-2.5 dB`. Always one
  /// decimal — keeps the column width visually stable as the knob
  /// moves.
  String get formattedDb {
    if (gainDb.abs() < 0.05) return '0 dB';
    final sign = gainDb > 0 ? '+' : '';
    return '$sign${gainDb.toStringAsFixed(1)} dB';
  }
}

/// Aggregate state for all three bands. Immutable; replace via
/// [LibraryController.setEqBand] / [LibraryController.resetEq].
class EqState {
  final EqBandState low;
  final EqBandState mid;
  final EqBandState high;

  const EqState({
    required this.low,
    required this.mid,
    required this.high,
  });

  /// Default state — every band disabled, flat. Same value the
  /// controller writes on first hydrate when no app_settings rows
  /// exist yet.
  static const EqState defaults = EqState(
    low: EqBandState.defaults,
    mid: EqBandState.defaults,
    high: EqBandState.defaults,
  );

  EqState copyWith({EqBandState? low, EqBandState? mid, EqBandState? high}) {
    return EqState(
      low: low ?? this.low,
      mid: mid ?? this.mid,
      high: high ?? this.high,
    );
  }

  bool get anyEnabled => low.enabled || mid.enabled || high.enabled;
  bool get isFlat =>
      _isFlat(low) && _isFlat(mid) && _isFlat(high) && !anyEnabled;

  static bool _isFlat(EqBandState b) =>
      !b.enabled && (b.gainDb.abs() < 0.05);
}

/// Three identity keys the controller maps to app_settings rows.
enum EqBand { low, mid, high }

extension EqBandWire on EqBand {
  String get wireName {
    switch (this) {
      case EqBand.low:
        return 'low';
      case EqBand.mid:
        return 'mid';
      case EqBand.high:
        return 'high';
    }
  }
}

/// Round to nearest 0.1 dB. The knob's continuous drag can land at
/// arbitrary fractional values; rounding before display + persist
/// keeps the formatted label stable and the persisted value
/// readable.
double roundEqGainDb(double raw) {
  return (raw * 10).round() / 10.0;
}

/// Clamp a raw drag-derived gain to the band's allowed range without
/// pulling in [EqBandState]. Used by knob widgets that want to clamp
/// before calling setEqBand.
double clampEqGainDb(double raw) {
  return math
      .min(math.max(raw, EqBandState.minGainDb), EqBandState.maxGainDb);
}
