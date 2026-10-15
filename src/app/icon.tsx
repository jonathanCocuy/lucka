import { ImageResponse } from 'next/og'
import { BRAND_COLORS } from '@/lib/constants/colors'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'
// El export estático lo genera en el build.
export const dynamic = 'force-static'

// "L" dibujada con dos trazos: ImageResponse no trae la fuente sin cargarla.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: BRAND_COLORS.primary,
          borderRadius: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            width: 13,
            height: 18,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 2,
              top: 0,
              width: 3,
              height: 18,
              background: BRAND_COLORS.inverse,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: 2,
              bottom: 0,
              width: 11,
              height: 2,
              background: BRAND_COLORS.inverse,
            }}
          />
        </div>
      </div>
    ),
    size,
  )
}
