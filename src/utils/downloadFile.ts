export const downloadFile = ({
  linkToFile,
  filename
}: { linkToFile: string, filename: string }) => {
  const a = document.createElement('a');
  a.href = linkToFile;
  a.download = filename;
  a.click();
}