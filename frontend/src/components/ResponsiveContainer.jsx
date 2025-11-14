import PropTypes from 'prop-types';

/**
 * Centered container with responsive horizontal padding and max-width constraints.
 * Ensures consistent content margins across mobile, tablet, and desktop viewports.
 * Uses Tailwind's container utility for automatic max-width breakpoints.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Content to constrain within container
 * @param {string} [props.className=''] - Additional Tailwind CSS classes
 * @param {boolean} [props.noPadding=false] - Remove default horizontal padding
 * @returns Centered container with responsive width and padding
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
