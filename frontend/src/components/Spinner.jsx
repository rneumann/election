export const Spinner = ({
  size = 48,
  thickness = 4,
  color = 'border-brand-primary',
  fullscreen = false,
  classProps = '',
}) => {
  const wrapperClasses = fullscreen
    ? 'flex items-center justify-center h-screen w-full'
    : 'inline-flex items-center justify-center';

  return (
    <div className={wrapperClasses}>
      <div
        className={`animate-spin rounded-full ${color} ${classProps}`}
        style={{
          width: size,
          height: size,
          borderWidth: thickness,
          borderStyle: 'solid',
          borderTopColor: 'transparent',
        }}
      />
    </div>
  );
};
