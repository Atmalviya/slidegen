import { redirect } from "next/navigation";
import { createUserIfNull } from "./actions";

const page = async () => {
  const { success } = await createUserIfNull();
  if (!success) {
    return (
      <div>
        Something went wrong while signing in! Try again or Contact support if
        you face the same problem{" "}
      </div>
    );
  }
  redirect("/");
};

export default page;
