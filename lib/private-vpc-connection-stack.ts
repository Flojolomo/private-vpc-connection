import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

/**
 * This stack intends to showcase how to spin up an EC2 instance in an isolated
 * subnet without internet connectivity.
 *  It relies on the post given in
 * {@link https://repost.aws/knowledge-center/ec2-systems-manager-vpc-endpoints}.
 */
export class PrivateVpcConnectionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = this.createVpc();
    const securityGroup = this.createSecurityGroup({ vpc });
    const instance = this.createEc2Instance({ securityGroup, vpc });
    this.createInterfaceEndpoints({ securityGroup, vpc });

    // Output the instance ID for convenience
    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
    });
  }

  private createEc2Instance({
    securityGroup,
    vpc,
  }: {
    securityGroup: ec2.ISecurityGroup;
    vpc: ec2.IVpc;
  }): ec2.IInstance {
    // Create the EC2 instance
    const instance = new ec2.Instance(this, 'ec2-instance', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: ec2.MachineImage.latestAmazonLinux2023(),
      securityGroup,
    });

    // Enable SSM access
    instance.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
    );

    return instance;
  }

  private createInterfaceEndpoints({
    securityGroup,
    vpc,
  }: {
    securityGroup: ec2.ISecurityGroup;
    vpc: ec2.IVpc;
  }): void {
    // This makes it possible for SSM to connect to the instance
    const subDomains = ['ssm', 'ec2messages', 'ssmmessages'];
    subDomains.forEach((subDomain) => {
      //  Ingress rules on security group is set by CDK
      new ec2.InterfaceVpcEndpoint(this, `vpc-endpoint-${subDomain}`, {
        vpc,
        service: new ec2.InterfaceVpcEndpointService(
          `com.amazonaws.${this.region}.${subDomain}`,
          443
        ),
        securityGroups: [securityGroup],
        /**
         * Required to establish communication with the instance.
         * Otherwise, the terminal does not show text.
         */
        privateDnsEnabled: true,
      });
    });
  }

  private createSecurityGroup({ vpc }: { vpc: ec2.IVpc }): ec2.ISecurityGroup {
    const securityGroup = new ec2.SecurityGroup(this, 'InstanceSecurityGroup', {
      vpc,
      allowAllOutbound: false,
    });

    /**
     * Required to establish communication with the instance.
     * Otherwise, the terminal does not show text and cannot be used.
     */
    securityGroup.addEgressRule(securityGroup, ec2.Port.tcp(443));

    return securityGroup;
  }

  private createVpc(): ec2.IVpc {
    return new ec2.Vpc(this, 'vpc', {
      natGateways: 0,
      maxAzs: 2,
    });
  }
}
