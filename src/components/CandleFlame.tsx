export function CandleFlame({ size = 56 }: { size?: number }) {
  return (
    <div
      className="relative flex items-end justify-center"
      style={{ width: size, height: size * 1.6 }}
    >
      <div
        className="candle-flame absolute bottom-[38%] rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-gradient-to-t from-flame via-gold-soft to-yellow-100"
        style={{ width: size * 0.42, height: size * 0.68 }}
      />
      <div
        className="rounded-t-sm bg-gradient-to-b from-[#fff8ea] to-[#d8cdb0]"
        style={{ width: size * 0.22, height: size * 0.55 }}
      />
    </div>
  );
}
