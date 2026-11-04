import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PhoneSpecs } from "@/types/phones";
import { formatSpec, specOrder } from "@/utils/formatSpecs";

type DeviceSpecsProps = {
  specs: PhoneSpecs;
};

export function DeviceSpecs({ specs }: Readonly<DeviceSpecsProps>) {
  return (
    <Card className="shadow-xl border">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">
          Especificações Técnicas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {specOrder.map((key) => {
            const value = specs[key];
            // Se o valor não existir, não renderiza nada
            if (value === null || value === undefined) return null;

            if (
              typeof value === "string" &&
              ["n/a", "na", "-", ""].includes(value.trim().toLowerCase())
            ) {
              return null;
            }

            const { label, formattedValue } = formatSpec(String(key), value);

            if (
              !formattedValue ||
              formattedValue.trim() === "" ||
              formattedValue.toLowerCase().includes("n/a")
            ) {
              return null;
            }

            return (
              <div key={key}>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-2">
                  <span className="font-medium text-muted-foreground">
                    {label}
                  </span>
                  <span className="text-foreground font-semibold">
                    {formattedValue}
                  </span>
                </div>
                <Separator />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
