export function Button({ children, primary = false, className = '', ...props }) {
  return <button className={`btn${primary ? ' p' : ' g'}${className ? ` ${className}` : ''}`} type="button" {...props}>{children}</button>
}

