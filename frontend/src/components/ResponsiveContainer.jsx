import PropTypes from 'prop-types';

/**
 * Responsive container component with consistent padding and max-width.
 * Provides mobile-optimized spacing across all screen sizes.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.noPadding] - Remove default padding
 * @returns {React.ReactElement} Responsive container
 */
const ResponsiveContainer = ({ children, className = '', noPadding = false }) => {
  const baseClasses = 'container mx-auto';
  const paddingClasses = noPadding ? '' : 'px-4 sm:px-6 lg:px-8';

  return <div className={`${baseClasses} ${paddingClasses} ${className}`}>{children}</div>;
};

ResponsiveContainer.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  noPadding: PropTypes.bool,
};

export default ResponsiveContainer;
