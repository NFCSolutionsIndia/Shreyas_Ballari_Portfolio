import { PALETTE } from './palette';

/**
 * Studio lighting for a product shot: a soft sky fill, a key light from the upper left, a cool
 * blue rim from behind for the frame's edges and a gentle front fill for the keycap faces. No
 * drop shadow: the board sits cleanly on the white page.
 */
export function KeyboardLighting() {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#30343c', 1.05]} />
      <directionalLight position={[-6, 14, 9]} intensity={2.1} />
      <directionalLight position={[8, 5, -7]} intensity={0.9} color={PALETTE.blueLight} />
      <directionalLight position={[0, 4, 14]} intensity={0.55} />
    </>
  );
}
