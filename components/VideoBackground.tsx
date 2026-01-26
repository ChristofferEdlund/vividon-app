"use client"

const VideoBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-black/50 z-10" />
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-50"
      >
        <source src="/Vividon_Beta_sign_up.mp4" type="video/mp4" />
      </video>
    </div>
  )
}

export default VideoBackground
