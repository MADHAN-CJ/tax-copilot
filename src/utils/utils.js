export const onClickBounceEffect = (event, timer, callback) => {
  const element = event?.currentTarget;

  // Apply the effects using JavaScript
  element.style.transition = `transform ${timer}ms ease, opacity ${timer}ms ease`;
  element.style.transform = "scale(0.95)";
  element.style.opacity = "0.7";
  setTimeout(() => {
    element.style.transform = "";
    element.style.opacity = "";
    callback();
  }, timer);
};
