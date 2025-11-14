import PropTypes from 'prop-types';

/**
 * Responsive card container with mobile-optimized spacing and optional hover effects.
 * Provides consistent shadow, rounded corners, and padding across screen sizes.
 * Supports hoverable variant with elevation animation for interactive elements.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className=''] - Additional Tailwind CSS classes
 * @param {boolean} [props.noPadding=false] - Remove default padding for custom layouts
 * @param {boolean} [props.hoverable=false] - Enable hover animation and pointer cursor
 * @returns White card container with responsive padding and optional interactions
 */
const ResponsiveCard = ({ children, className = '', noPadding = false, hoverable = false }) => {
  const baseClasses = 'bg-white rounded-lg shadow-lg';
  const paddingClasses = noPadding ? '' : 'p-4 sm:p-6 md:p-8';
  const hoverClasses = hoverable
    ? 'transition-transform duration-200 hover:shadow-xl hover:-translate-y-1 cursor-pointer'
    : '';

  return (
    <div className={`${baseClasses} ${paddingClasses} ${hoverClasses} ${className}`}>
      {children}
    </div>
  );
};

ResponsiveCard.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  noPadding: PropTypes.bool,
  hoverable: PropTypes.bool,
};

export default ResponsiveCard;
