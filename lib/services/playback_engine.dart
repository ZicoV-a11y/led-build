import 'dart:async';

import 'package:media_kit/media_kit.dart';

import '../models/eq_state.dart';

/// Processing state the controller observes. Local enum so the
/// concrete audio backend stays swappable — the controller doesn't
/// import media_kit types.
enum ProcessingState { idle, loading, buffering, ready, completed }

/// media_kit-backed PlaybackEngine.
///
/// Chosen 2026-07-02 after the flutter_soloud swap failed the AIFF
/// requirement (miniaudio has no AIFF decoder). media_kit wraps
/// libmpv + FFmpeg, so AIFF plays natively AND the equalizer is
/// available via libmpv's `af` audio-filter chain.
///
/// **Contract preserved from just_audio**: setTrack / play / pause /
/// stop / seek / setVolume + position/duration/playing/processing
/// streams. Controller code is unchanged.
///
/// **EQ chain**: `applyEqState` translates the 3-band UI into an
/// `af=lavfi=[...]` filter string:
///   - LOW  → `bass=g=<gain>:f=120`           (low shelf)
///   - MID  → `equalizer=f=1000:t=q:w=1:g=<gain>` (mid bell)
///   - HIGH → `treble=g=<gain>:f=8000`        (high shelf)
///
/// Disabled bands drop out of the chain (no processing overhead).
/// The chain is set once per EQ change via NativePlayer.setProperty
/// — libmpv handles the hot-swap without gaps in playback.
class PlaybackEngine {
  PlaybackEngine() {
    _wireStreams();
  }

  final Player _player = Player();
  String? _currentPath;
  StreamSubscription<Duration>? _positionSub;
  StreamSubscription<Duration>? _durationSub;
  StreamSubscription<bool>? _playingSub;
  StreamSubscription<bool>? _completedSub;
  StreamSubscription<bool>? _bufferingSub;
  bool _afEverWritten = false;
  EqState _pendingEq = EqState.defaults;

  /// Debounce for `setProperty('af', ...)` writes. Each write
  /// reinitializes mpv's filter graph, which causes an audible
  /// stutter/glitch. Knob drags emit ~30-60 mutations per second;
  /// coalescing them into ~one write per 80ms is inaudible to the
  /// user's hand but eliminates the graph rebuild storm.
  Timer? _eqDebounce;
  static const Duration _eqDebounceDelay = Duration(milliseconds: 80);

  final StreamController<Duration> _positionCtrl =
      StreamController.broadcast();
  final StreamController<Duration?> _durationCtrl =
      StreamController.broadcast();
  final StreamController<bool> _playingCtrl =
      StreamController.broadcast();
  final StreamController<ProcessingState> _processingCtrl =
      StreamController.broadcast();

  void _wireStreams() {
    _positionSub = _player.stream.position.listen((p) {
      _positionCtrl.add(p);
    });
    _durationSub = _player.stream.duration.listen((d) {
      // media_kit reports Duration.zero before a track's duration is
      // resolved. We forward null in that window so the controller's
      // "duration unknown" UX still renders honestly.
      _durationCtrl.add(d == Duration.zero ? null : d);
    });
    _playingSub = _player.stream.playing.listen((p) {
      _playingCtrl.add(p);
    });
    _completedSub = _player.stream.completed.listen((completed) {
      if (completed) {
        _processingCtrl.add(ProcessingState.completed);
      }
    });
    // Log stream — surfaces mpv's own diagnostics (including
    // silent rejections of properties like `af`) so we can see
    // WHY a filter chain isn't being applied. Filter to interesting
    // levels only or the terminal drowns.
    _player.stream.log.listen((log) {
      final text = log.text;
      if (text.contains('af') ||
          text.contains('audio') ||
          text.contains('filter') ||
          log.level == 'error' ||
          log.level == 'warn') {
        // ignore: avoid_print
        print('[mpv/${log.level}/${log.prefix}] $text');
      }
    });
    _bufferingSub = _player.stream.buffering.listen((buffering) {
      // Only surface loading/ready transitions — media_kit fires
      // `buffering=true` during initial load AND during network/disk
      // stalls; the controller only needs the coarse ready/loading
      // signal for its own play-state machine.
      _processingCtrl.add(
        buffering ? ProcessingState.loading : ProcessingState.ready,
      );
    });
  }

  String? get currentPath => _currentPath;
  bool get isPlaying => _player.state.playing;
  Duration get position => _player.state.position;
  Duration? get duration {
    final d = _player.state.duration;
    return d == Duration.zero ? null : d;
  }

  /// Our API is 0.0..1.0; media_kit uses 0.0..100.0 internally.
  double get volume => _player.state.volume / 100.0;

  Stream<Duration> get positionStream => _positionCtrl.stream;
  Stream<Duration?> get durationStream => _durationCtrl.stream;
  Stream<bool> get playingStream => _playingCtrl.stream;
  Stream<ProcessingState> get processingStateStream =>
      _processingCtrl.stream;

  Future<void> setTrack(String filePath) async {
    if (_currentPath == filePath) return;
    _currentPath = filePath;
    _processingCtrl.add(ProcessingState.loading);
    // `play: false` — load without auto-starting. The controller
    // calls play() explicitly after setTrack.
    await _player.open(Media(filePath), play: false);
    // Try applying the buffered EQ state now that a media pipeline
    // exists. `_writeAf` internally decides whether to touch libmpv
    // (see the `_afEverWritten` gate — never call setProperty with
    // an empty string on a cold pipeline, or the audio output dies).
    _writeAf(_pendingEq);
  }

  Future<void> play() => _player.play();
  Future<void> pause() => _player.pause();
  Future<void> stop() => _player.stop();
  Future<void> seek(Duration position) => _player.seek(position);

  /// Our API: 0.0..1.0. media_kit's setVolume: 0.0..100.0.
  Future<void> setVolume(double v) async {
    final clamped = v.clamp(0.0, 1.0).toDouble();
    await _player.setVolume(clamped * 100.0);
  }

  // ─── EQ wiring (slice 2 — actually shapes the sound) ─────────────

  /// Apply [eq] to libmpv's audio-filter chain. Called by the
  /// controller whenever the EQ state changes — every knob twist,
  /// every power-toggle, reset, hydrate. Safe to call before the
  /// player is initialized; state is buffered and applied at open
  /// time.
  void applyEqState(EqState eq) {
    _pendingEq = eq;
    // Debounced write. Every incoming eq mutation resets the timer;
    // the actual `setProperty('af', ...)` only fires once knob
    // movement has quieted for _eqDebounceDelay. Prevents the
    // filter-graph rebuild storm that made the audio stutter
    // during drag. See _eqDebounceDelay's doc comment for the
    // rationale on the specific 80ms value.
    _eqDebounce?.cancel();
    _eqDebounce = Timer(_eqDebounceDelay, () {
      _writeAf(_pendingEq);
    });
  }

  void _writeAf(EqState eq) {
    final platform = _player.platform;
    if (platform is! NativePlayer) return;

    // Real 3-band EQ. Uses FFmpeg's `equalizer` peaking-filter
    // (available in this libmpv bundle) via the lavfi wrapper.
    // Written through `setProperty('af', ...)` because the runtime
    // `af set` command silently no-ops on this build (mpv's User
    // filter list stays empty). The property path DOES install
    // the graph — that's the discovery from V6 diagnostic.
    //
    // Chain layout — LOW/HIGH shelved via WIDE peaking filters
    // (this libmpv build lacks the `bass`/`treble` shelf filters,
    // so we widen `equalizer` with `t=o:w=2` (2 octaves) to
    // approximate a shelf response). MID stays as a normal Q=1
    // bell.
    //   LOW  → equalizer @ 80 Hz, ~2 octaves wide  (shelf-like)
    //   MID  → equalizer @ 1 kHz, Q=1              (peaking bell)
    //   HIGH → equalizer @ 10 kHz, ~2 octaves wide (shelf-like)
    // Disabled or flat bands drop out of the chain so mpv doesn't
    // waste CPU on 0-gain filters.
    final filters = <String>[];
    if (eq.low.enabled && eq.low.gainDb.abs() > 0.05) {
      filters.add('equalizer=f=80:t=o:w=2:g='
          '${eq.low.gainDb.toStringAsFixed(2)}');
    }
    if (eq.mid.enabled && eq.mid.gainDb.abs() > 0.05) {
      filters.add('equalizer=f=1000:t=q:w=1:g='
          '${eq.mid.gainDb.toStringAsFixed(2)}');
    }
    if (eq.high.enabled && eq.high.gainDb.abs() > 0.05) {
      filters.add('equalizer=f=10000:t=o:w=2:g='
          '${eq.high.gainDb.toStringAsFixed(2)}');
    }

    if (filters.isEmpty) {
      if (!_afEverWritten) return;
      platform.setProperty('af', '');
      return;
    }
    final graph = 'lavfi=[${filters.join(',')}]';
    platform.setProperty('af', graph);
    _afEverWritten = true;
  }

  Future<void> dispose() async {
    _eqDebounce?.cancel();
    _eqDebounce = null;
    await _positionSub?.cancel();
    await _durationSub?.cancel();
    await _playingSub?.cancel();
    await _completedSub?.cancel();
    await _bufferingSub?.cancel();
    await _positionCtrl.close();
    await _durationCtrl.close();
    await _playingCtrl.close();
    await _processingCtrl.close();
    await _player.dispose();
  }
}
