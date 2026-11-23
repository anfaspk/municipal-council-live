/**
 * Candidate photo size of the whole application.
 *
 * false (default, public sites): every screen uses its usual photo field.
 * true (internal sites result-stg-int / result-int only, few users): every screen uses the
 *   large photo (iml) first, and the other fields only when iml is missing.
 *
 * Keep it false here. The internal build script (Build-StagingInternalPackage.ps1) sets it to
 * true in its own build copy, so a build for the public servers never ships the large photos.
 */
export const LARGE_PHOTOS: boolean = false;
