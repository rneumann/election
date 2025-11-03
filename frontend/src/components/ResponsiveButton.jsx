import PropTypes from 'prop-types';

/**
 * Responsive button component with touch-optimized sizing.
 * Provides consistent button styling across all screen sizes.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.variant='primary'] - Button style variant (primary, secondary, danger)
 * @param {string} [props.size='medium'] - Button size (small, medium, large)
 * @param {boolean} [props.fullWidth] - Make button full width
 * @param {boolean} [props.disabled] - Disable button
 * @param {Function} [props.onClick] - Click handler
 * @param {string} [props.type='button'] - Button type
 * @param {string} [props.className] - Additional CSS classes
 * @returns {React.ReactElement} Responsive button
 */
const ResponsiveButton = ({
  children,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) => {
  const baseClasses =
    'rounded-lg font-semibold transition-all duration-200 touch-manipulation disabled:cursor-not-allowed disabled:opacity-50';

  // Variant styles
  const variantClasses = {
    primary:
      'bg-brand-primary text-white hover:opacity-90 active:opacity-80 shadow-md hover:shadow-lg disabled:bg-gray-400',
    secondary:
      'bg-white text-brand-primary border-2 border-brand-primary hover:bg-brand-light active:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg',
    outline:
      'border-2 border-brand-gray text-brand-dark hover:bg-brand-light active:bg-gray-200 bg-transparent',
  };

  // Size styles (with mobile-optimized touch targets)
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm sm:px-4 sm:py-2',
    medium: 'px-4 py-2.5 text-sm sm:px-5 sm:py-3 sm:text-base min-h-touch',
    large: 'px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-lg min-h-touch',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  // Safe property access with defaults
  const getVariantClass = () => {
    if (variant === 'primary') {
      return variantClasses.primary;
    }
    if (variant === 'secondary') {
      return variantClasses.secondary;
    }
    if (variant === 'danger') {
      return variantClasses.danger;
    }
    if (variant === 'outline') {
      return variantClasses.outline;
    }
    return variantClasses.primary;
  };

  const getSizeClass = () => {
    if (size === 'small') {
      return sizeClasses.small;
    }
    if (size === 'large') {
      return sizeClasses.large;
    }
    return sizeClasses.medium;
  };

  const selectedVariant = getVariantClass();
  const selectedSize = getSizeClass();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${selectedVariant} ${selectedSize} ${widthClass} ${className}`}
    >
      {children}
    </button>
  );
};

ResponsiveButton.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger', 'outline']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  className: PropTypes.string,
};

export default ResponsiveButton;
