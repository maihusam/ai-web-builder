import {
  AccountSettingsCards,
  ChangePasswordCard,
  DeleteAccountCard,
} from "@daveyplate/better-auth-ui";

const Settings = () => {
  return (
    <div className="w-full p-4 flex justify-center items-center min-h-[90vh] flex-col gap-6 py-12 bg-background">
      <AccountSettingsCards
        classNames={{
          card: {
            base: "bg-card border border-border shadow-sm max-w-xl mx-auto",
            footer: "bg-muted/50 border-t border-border",
          },
        }}
      />
      <div className="w-full">
        <ChangePasswordCard
          classNames={{
            base: "bg-card border border-border shadow-sm max-w-xl mx-auto",
            footer: "bg-muted/50 border-t border-border",
          }}
        />
      </div>
      <div className="w-full">
        <DeleteAccountCard
          classNames={{
            base: "bg-destructive/10 border border-destructive shadow-sm max-w-xl mx-auto",
          }}
        />
      </div>
    </div>
  );
};

export default Settings;
