function getBaseUrl(request: Request) {
  const url = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ?? url.protocol.replace(":", "");
  const host = forwardedHost ?? url.host;

  return `${protocol}://${host}`;
}

function createManifestXml(baseUrl: string) {
  const host = new URL(baseUrl).host;

  return `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp
  xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
  xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversionoverrides"
  xsi:type="TaskPaneApp">
  <Id>12345678-1234-1234-1234-123456789abc</Id>
  <Version>1.0.1.0</Version>
  <ProviderName>Slide Handout</ProviderName>
  <DefaultLocale>de-DE</DefaultLocale>
  <DisplayName DefaultValue="Slide Handout"/>
  <Description DefaultValue="Live-Handout für Präsentationen - Inhalte schalten sich folienweise frei."/>
  <IconUrl DefaultValue="${baseUrl}/powerpoint/icon-32.png"/>
  <HighResolutionIconUrl DefaultValue="${baseUrl}/powerpoint/icon-64.png"/>
  <SupportUrl DefaultValue="${baseUrl}/powerpoint"/>
  <AppDomains>
    <AppDomain>${host}</AppDomain>
  </AppDomains>
  <Hosts>
    <Host Name="Presentation"/>
  </Hosts>
  <DefaultSettings>
    <SourceLocation DefaultValue="${baseUrl}/powerpoint/addin"/>
  </DefaultSettings>
  <Permissions>ReadDocument</Permissions>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Presentation">
        <DesktopFormFactor>
          <GetStarted>
            <Title resid="GetStarted.Title"/>
            <Description resid="GetStarted.Description"/>
            <LearnMoreUrl resid="GetStarted.LearnMoreUrl"/>
          </GetStarted>
          <FunctionFile resid="Taskpane.Url"/>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="CommandsGroup">
                <Label resid="CommandsGroup.Label"/>
                <Icon>
                  <bt:Image size="16" resid="Icon.16x16"/>
                  <bt:Image size="32" resid="Icon.32x32"/>
                  <bt:Image size="80" resid="Icon.80x80"/>
                </Icon>
                <Control xsi:type="Button" id="TaskpaneButton">
                  <Label resid="TaskpaneButton.Label"/>
                  <Supertip>
                    <Title resid="TaskpaneButton.Label"/>
                    <Description resid="TaskpaneButton.Tooltip"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16"/>
                    <bt:Image size="32" resid="Icon.32x32"/>
                    <bt:Image size="80" resid="Icon.80x80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>SlideHandoutTaskpane</TaskpaneId>
                    <SourceLocation resid="Taskpane.Url"/>
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16x16" DefaultValue="${baseUrl}/powerpoint/icon-16.png"/>
        <bt:Image id="Icon.32x32" DefaultValue="${baseUrl}/powerpoint/icon-32.png"/>
        <bt:Image id="Icon.80x80" DefaultValue="${baseUrl}/powerpoint/icon-80.png"/>
      </bt:Images>
      <bt:Urls>
        <bt:Url id="GetStarted.LearnMoreUrl" DefaultValue="${baseUrl}/powerpoint"/>
        <bt:Url id="Taskpane.Url" DefaultValue="${baseUrl}/powerpoint/addin"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="GetStarted.Title" DefaultValue="Slide Handout ist bereit"/>
        <bt:String id="CommandsGroup.Label" DefaultValue="Slide Handout"/>
        <bt:String id="TaskpaneButton.Label" DefaultValue="Slide Handout"/>
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="GetStarted.Description" DefaultValue="Verbinden Sie PowerPoint direkt mit Ihrer Live-Session."/>
        <bt:String id="TaskpaneButton.Tooltip" DefaultValue="Öffnet die Slide-Handout-Steuerung"/>
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
`;
}

export function GET(request: Request) {
  const baseUrl = getBaseUrl(request);
  const manifest = createManifestXml(baseUrl);

  return new Response(manifest, {
    headers: {
      "content-disposition":
        'attachment; filename="slide-handout-powerpoint-addin.xml"',
      "content-type": "text/xml; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
