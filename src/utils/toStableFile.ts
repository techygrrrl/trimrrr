export const toStableFile = async (file: File): Promise<File> => {
  const filename = file.name
  const mimeType = file.type

  const buffer = await file.arrayBuffer()
  const blob = new Blob([buffer], { type: mimeType })
  const stableFile = new File([blob], filename, {
    type: mimeType,
  })

  return stableFile
}
