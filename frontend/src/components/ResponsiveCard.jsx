import PropTypes from 'prop-types';

/**
 * Responsive card component with mobile-optimized padding and spacing.
 * Provides consistent card styling across all screen sizes.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.noPadding] - Remove default padding
 * @param {boolean} [props.hoverable] - Add hover effect
 * @returns {React.ReactElement} Responsive card
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
