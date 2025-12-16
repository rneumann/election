import PropTypes from "prop-types";

/**
 * Touch-optimized button component with responsive sizing and variant styles.
 * Provides consistent button styling across mobile and desktop with minimum touch target sizes.
 * Supports multiple style variants (primary, secondary, danger, outline) and sizes.
 *
 * @param {object} props - Component props
 * @param {React.ReactNode} props.children - Button label or content
 * @param {string} [props.variant='primary'] - Style variant (primary, secondary, danger, outline)
 * @param {string} [props.size='medium'] - Size preset (small, medium, large)
 * @param {boolean} [props.fullWidth=false] - Expand to full container width
 * @param {boolean} [props.disabled=false] - Disable button interaction
 * @param {Function} [props.onClick] - Click event handler
 * @param {string} [props.type='button'] - HTML button type attribute
 * @param {string} [props.className=''] - Additional Tailwind CSS classes
 * @param props.toolTip
 * @param props.toolTipPlacement
 * @returns Styled button element with variant-specific appearance and responsive sizing
 */
const ResponsiveButton = ({
  children,
  variant = "primary",
  size = "medium",
  fullWidth = false,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  toolTip = undefined,
  toolTipPlacement = "top",
}) => {
  const baseClasses =
    "rounded-lg font-semibold transition-all duration-200 touch-manipulation disabled:cursor-not-allowed disabled:opacity-50";

  // Variant styles
  const variantClasses = {
    primary:
      "bg-brand-primary text-white hover:opacity-90 active:opacity-80 shadow-md hover:shadow-lg disabled:bg-gray-400 transition-colors",
    secondary:
      "bg-white text-brand-primary border-2 border-brand-primary hover:bg-brand-light active:bg-gray-100 transition-colors",
    danger:
      "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md hover:shadow-lg transition-colors",
    outline:
      "bg-gray-500 border-2 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-700 active:bg-gray-700 shadow-md font-semibold transition-colors",
    ghost:
      "bg-transparent text-white border-none shadow-none p-0 hover:opacity-80 active:opacity-60 transition-opacity",
    icon: "bg-transparent border-none shadow-none p-0 hover:opacity-80 active:opacity-60 transition-opacity",
  };

  // Size styles (with mobile-optimized touch targets)
  const sizeClasses = {
    small: "px-3 py-1.5 text-sm sm:px-4 sm:py-2",
    medium: "px-4 py-2.5 text-sm sm:px-5 sm:py-3 sm:text-base min-h-touch",
    large: "px-6 py-3 text-base sm:px-8 sm:py-4 sm:text-lg min-h-touch",
    icon: "p-2 h-auto w-auto flex items-center justify-center",
  };

  const tooltipPositionClasses = {
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    left: "left-full mr-2 top-1/2 -translate-y-1/2",
    right: "right-full ml-2 top-1/2 -translate-y-1/2",
  };

  const widthClass = fullWidth ? "w-full" : "";

  // Safe property access with defaults
  const getVariantClass = () => {
    if (variant === "primary") {
      return variantClasses.primary;
    }
    if (variant === "secondary") {
      return variantClasses.secondary;
    }
    if (variant === "danger") {
      return variantClasses.danger;
    }
    if (variant === "outline") {
      return variantClasses.outline;
    }
    if (variant === "ghost") {
      return variantClasses.ghost;
    }
    if (variant === "icon") {
      return variantClasses.icon;
    }
    return variantClasses.primary;
  };

  const getSizeClass = () => {
    if (size === "small") {
      return sizeClasses.small;
    }
    if (size === "large") {
      return sizeClasses.large;
    }
    if (size === "icon") {
      return sizeClasses.icon;
    }
    return sizeClasses.medium;
  };

  const selectedVariant = getVariantClass();
  const selectedSize = getSizeClass();

  /* eslint-disable */
  const selectedTooltipPosition =
    tooltipPositionClasses[toolTipPlacement] || tooltipPositionClasses.bottom;
  /* eslint-enable */
  return (
    <div className="group relative">
      {/* Tooltip */}
      {toolTip && (
        <span
          role="tooltip"
          className={`absolute ${selectedTooltipPosition} z-50 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-all`}
        >
          {toolTip}
        </span>
      )}

      {/* Button */}
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${baseClasses} ${selectedVariant} ${selectedSize} ${widthClass} ${className}`}
        aria-label={toolTip || undefined}
        aria-disabled={disabled}
      >
        {children}
      </button>
    </div>
  );
};

ResponsiveButton.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(["primary", "secondary", "danger", "outline"]),
  size: PropTypes.oneOf(["small", "medium", "large"]),
  fullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  className: PropTypes.string,
};

export default ResponsiveButton;
