type Duration = {
  minutes: number
  seconds: number
}

export const toDuration = (millis: number): Duration => {
  if (!millis) return {
    minutes: 0,
    seconds: 0,
  }

  const totalSeconds = Math.floor(millis / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return {
    minutes,
    seconds,
  }
}

export const formatDuration = (millis: number): string => {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((millis % 1000) / 10);

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(minutes)}m ${pad(seconds)}s ${pad(centiseconds)}`;
}