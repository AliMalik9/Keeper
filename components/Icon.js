import SOLAR_ICONS from '@/lib/solar-icons';

/**
 * Renders a Solar icon from the generated subset in lib/solar-icons.js.
 *
 *   <Icon name="notes-minimalistic" size={20} />
 *
 * The generated registry is locked to Solar's Bold Duotone style. Icons
 * inherit the current text colour from their parent.
 */
export default function Icon({ name, size = 20, className = '', title, ...rest }) {
  const icon = SOLAR_ICONS[name];

  if (!icon) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`<Icon> — unknown Solar icon "${name}". Add it to scripts/build-icons.mjs.`);
    }
    return null;
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`${icon.left} ${icon.top} ${icon.width} ${icon.height}`}
      aria-hidden={title ? undefined : 'true'}
      role={title ? 'img' : undefined}
      focusable="false"
      className={`shrink-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + icon.body }}
      {...rest}
    />
  );
}
