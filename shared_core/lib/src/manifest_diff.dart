import 'track_identity.dart';

/// The diff between what's currently on a device and what a
/// freshly-computed manifest says SHOULD be on it. Both sides
/// compute and display this BEFORE any bytes move:
///
///   - Phone "Ready to Sync" screen renders it as
///     `Tracks to add: 50 / Tracks to remove: 48 /
///      Net change: +2 / Est. size: 4.97 GB`.
///   - Desktop approval modal renders it as
///     `This will replace 50 songs (4.83 GB) with 50 new songs
///      (4.97 GB). Net change: +0.14 GB`.
///
/// That visibility is the "never remove without permission" rule
/// from the mockup's design notes — the user always sees exactly
/// what's going to change before they hit Approve.
class ManifestDiff {
  /// Identities the manifest contains that aren't already cached
  /// on the device. These will be downloaded.
  final List<TrackIdentity> needAdd;

  /// `intel_uid`s the device currently holds that the new manifest
  /// drops. These will be deleted from the phone after sync. Just
  /// the intel_uids — removal needs nothing more than the
  /// reconciliation key (no content_hash to verify, no variant_id
  /// to disambiguate; the phone walks its inventory and drops
  /// every cached row whose intel_uid is in this list).
  final List<String> needRemove;

  /// Total transport-variant bytes the [needAdd] set adds up to.
  final int needAddBytes;

  /// Total transport-variant bytes the [needRemove] set adds up to.
  final int needRemoveBytes;

  /// Bytes the phone currently holds (pre-sync). Drives the
  /// "Device After Sync" line on the rotation summary.
  final int currentInventoryBytes;

  /// Track count the phone currently holds (pre-sync).
  final int currentTrackCount;

  const ManifestDiff({
    required this.needAdd,
    required this.needRemove,
    required this.needAddBytes,
    required this.needRemoveBytes,
    required this.currentInventoryBytes,
    required this.currentTrackCount,
  });

  int get netCountChange => needAdd.length - needRemove.length;
  int get netBytesChange => needAddBytes - needRemoveBytes;
  int get afterSyncTrackCount => currentTrackCount + netCountChange;
  int get afterSyncBytes => currentInventoryBytes + netBytesChange;

  /// `true` when nothing would change. UI suppresses the approval
  /// modal for empty diffs and shows "Already in sync."
  bool get isNoOp =>
      needAdd.isEmpty && needRemove.isEmpty;

  Map<String, Object?> toJson() => {
        'need_add': [for (final t in needAdd) t.toJson()],
        'need_remove': needRemove,
        'need_add_bytes': needAddBytes,
        'need_remove_bytes': needRemoveBytes,
        'current_inventory_bytes': currentInventoryBytes,
        'current_track_count': currentTrackCount,
      };

  static ManifestDiff fromJson(Map<String, Object?> j) {
    final add = j['need_add'];
    final remove = j['need_remove'];
    if (add is! List) {
      throw const FormatException('ManifestDiff.need_add required (list)');
    }
    if (remove is! List) {
      throw const FormatException('ManifestDiff.need_remove required (list)');
    }
    return ManifestDiff(
      needAdd: [
        for (final t in add) TrackIdentity.fromJson(t as Map<String, Object?>),
      ],
      needRemove: [
        for (final v in remove)
          if (v is String) v
          else throw const FormatException(
              'ManifestDiff.need_remove entries must be intel_uid strings'),
      ],
      needAddBytes: _asInt(j['need_add_bytes']) ?? 0,
      needRemoveBytes: _asInt(j['need_remove_bytes']) ?? 0,
      currentInventoryBytes: _asInt(j['current_inventory_bytes']) ?? 0,
      currentTrackCount: _asInt(j['current_track_count']) ?? 0,
    );
  }
}

int? _asInt(Object? v) {
  if (v == null) return null;
  if (v is int) return v;
  if (v is num) return v.toInt();
  if (v is String) return int.tryParse(v);
  return null;
}
